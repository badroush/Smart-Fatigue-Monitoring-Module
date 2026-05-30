import { randomBytes } from 'crypto';
import { getPool } from '../config/database.js';
import { uuidToBuffer, newUuidString, bufferToUuid } from '../utils/uuid.js';
import {
  buildAnalyseFromApi,
  buildCapteursFromApi,
  determineAlerteType,
  genererMessageAlerte,
  getScoreGlobal,
  niveauNecessiteAlerteFatigue,
} from '../domain/fatigueCompute.js';
import { getDataProvider } from '../data/provider.js';
import { replicateIngestToFirestore } from '../data/firestore/ingest.js';
import { enqueueFirestoreSync } from '../data/firestoreOutbox.js';

const MODULE_TYPES = {
  BATTERIE_FAIBLE: 'batterie_faible',
  SURCHAUFFE: 'surchauffe',
  PORT_DECONNECTE: 'port_deconnecte',
};

function fmtMysql(input) {
  if (input == null || input === '') {
    return formatNowLocalMysql();
  }
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
    if (m) {
      return `${m[1]} ${m[2]}`;
    }
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    return formatNowLocalMysql();
  }
  return formatDateLocalMysql(d);
}

function formatNowLocalMysql() {
  return formatDateLocalMysql(new Date());
}

function formatDateLocalMysql(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function validatePayload(data) {
  if (!data || typeof data !== 'object') {
    return 'Corps JSON invalide';
  }
  if (!data.idVehicule || !data.idConducteur) {
    return 'Les champs idVehicule et idConducteur sont obligatoires';
  }
  const dc = data.donneesCapteurs;
  const af = data.analyseFatigue;
  const loc = data.localisationGPS;
  if (!dc || !af || !loc) {
    return 'donneesCapteurs, analyseFatigue et localisationGPS sont obligatoires';
  }
  const dcFields = [
    'temperatureAmbiante',
    'humidite',
    'luminosite',
    'temperatureCorporelle',
    'dureeConduite',
  ];
  for (const f of dcFields) {
    if (dc[f] === undefined || dc[f] === null) {
      return `donneesCapteurs.${f} est obligatoire`;
    }
  }
  const afFields = [
    'ear',
    'mar',
    'pitch',
    'yaw',
    'nombreClignements',
    'dureeYeuxFermes',
    'nombreBaillements',
  ];
  for (const f of afFields) {
    if (af[f] === undefined || af[f] === null) {
      return `analyseFatigue.${f} est obligatoire`;
    }
  }
  if (loc.latitude === undefined || loc.longitude === undefined) {
    return 'localisationGPS.latitude et longitude sont obligatoires';
  }
  return null;
}

async function findConducteur(conn, idConducteur) {
  const [[byPermis]] = await conn.query(
    `SELECT id, nom FROM conducteur WHERE numero_permis = ? LIMIT 1`,
    [idConducteur]
  );
  if (byPermis) return byPermis;
  const [[first]] = await conn.query(
    `SELECT id, nom FROM conducteur ORDER BY id ASC LIMIT 1`
  );
  return first || null;
}

async function creerAlerteModuleSiInexistante(
  conn,
  vehiculeIdBuf,
  type,
  message
) {
  const [[existing]] = await conn.query(
    `SELECT id FROM alerte_module WHERE vehicule_id = ? AND type = ? AND statut = 'active' LIMIT 1`,
    [vehiculeIdBuf, type]
  );
  if (existing) return;
  const aid = uuidToBuffer(newUuidString());
  await conn.query(
    `INSERT INTO alerte_module (id, vehicule_id, type, message, statut, horodatage, metadata)
     VALUES (?, ?, ?, ?, 'active', NOW(), NULL)`,
    [aid, vehiculeIdBuf, type, message.slice(0, 255)]
  );
}

async function resoudreAlerteModule(conn, vehiculeIdBuf, type) {
  await conn.query(
    `UPDATE alerte_module SET statut = 'resolue', resolue_at = NOW()
     WHERE vehicule_id = ? AND type = ? AND statut = 'active'`,
    [vehiculeIdBuf, type]
  );
}

async function verifierEtatModule(conn, vehiculeIdBuf, data) {
  if (data.niveauBatterie !== undefined) {
    const n = Number(data.niveauBatterie);
    if (n < 20) {
      await creerAlerteModuleSiInexistante(
        conn,
        vehiculeIdBuf,
        MODULE_TYPES.BATTERIE_FAIBLE,
        `Batterie critique (${n}%)`
      );
    } else {
      await resoudreAlerteModule(
        conn,
        vehiculeIdBuf,
        MODULE_TYPES.BATTERIE_FAIBLE
      );
    }
  }
  if (data.temperatureInterne !== undefined) {
    const t = Number(data.temperatureInterne);
    if (t > 70) {
      await creerAlerteModuleSiInexistante(
        conn,
        vehiculeIdBuf,
        MODULE_TYPES.SURCHAUFFE,
        `Surchauffe du module (${t.toFixed(1)}°C)`
      );
    } else {
      await resoudreAlerteModule(
        conn,
        vehiculeIdBuf,
        MODULE_TYPES.SURCHAUFFE
      );
    }
  }
  if (data.portExterneConnecte !== undefined) {
    const p = Boolean(data.portExterneConnecte);
    if (!p) {
      await creerAlerteModuleSiInexistante(
        conn,
        vehiculeIdBuf,
        MODULE_TYPES.PORT_DECONNECTE,
        'Port externe déconnecté - Module partiellement opérationnel'
      );
    } else {
      await resoudreAlerteModule(
        conn,
        vehiculeIdBuf,
        MODULE_TYPES.PORT_DECONNECTE
      );
    }
  }
}

export async function ingestFatigueEvent({ body, headers }) {
  const pool = getPool();
  if (!pool) {
    return {
      status: 503,
      json: {
        success: false,
        error: 'Service unavailable',
        message: 'Base de données non configurée (DATABASE_URL)',
      },
    };
  }

  let data = body;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return {
        status: 400,
        json: {
          success: false,
          error: 'Invalid JSON format',
          message: 'Le format JSON est invalide',
        },
      };
    }
  }

  const v = validatePayload(data);
  if (v) {
    return {
      status: 400,
      json: {
        success: false,
        error: 'Missing required fields',
        message: v,
      },
    };
  }

  const apiKey = headers['x-api-key'];
  if (!apiKey) {
    return {
      status: 401,
      json: {
        success: false,
        error: 'Missing API Key',
        message: "La clé API est requise dans l'en-tête X-API-KEY",
      },
    };
  }

  const [[vehicule]] = await pool.query(
    `SELECT id, immatriculation, is_active, is_monitored FROM vehicule WHERE sfam_api_key = ? LIMIT 1`,
    [apiKey]
  );

  if (!vehicule) {
    return {
      status: 401,
      json: {
        success: false,
        error: 'Invalid API Key',
        message: 'Clé API invalide ou véhicule non trouvé',
      },
    };
  }

  if (!vehicule.is_active || !vehicule.is_monitored) {
    return {
      status: 403,
      json: {
        success: false,
        error: 'Vehicle not active',
        message: "Le véhicule n'est pas actif ou n'est pas surveillé",
      },
    };
  }

  const cap = buildCapteursFromApi(data.donneesCapteurs);
  const ana = buildAnalyseFromApi(data.analyseFatigue);
  const scoreGlobal = getScoreGlobal(ana.scoreFatigue, cap.scoreConfort);

  const horodatageDc = data.donneesCapteurs.horodatage
    ? fmtMysql(data.donneesCapteurs.horodatage)
    : fmtMysql(new Date());
  const horodatageAf = data.analyseFatigue.horodatage
    ? fmtMysql(data.analyseFatigue.horodatage)
    : fmtMysql(new Date());
  const horodatageLoc = data.localisationGPS.horodatage
    ? fmtMysql(data.localisationGPS.horodatage)
    : fmtMysql(new Date());
  const horodatagePaquet = data.horodatage
    ? fmtMysql(data.horodatage)
    : fmtMysql(new Date());

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const locId = newUuidString();
    const dcId = newUuidString();
    const afId = newUuidString();
    const paquetId = newUuidString();

    const locBuf = uuidToBuffer(locId);
    const dcBuf = uuidToBuffer(dcId);
    const afBuf = uuidToBuffer(afId);
    const paquetBuf = uuidToBuffer(paquetId);
    const vehiculeIdBuf = vehicule.id;

    await conn.query(
      `INSERT INTO localisation_gps (id, latitude, longitude, altitude, gps_precision, horodatage, adresse, pays, ville, code_postal)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
      [
        locBuf,
        Number(data.localisationGPS.latitude),
        Number(data.localisationGPS.longitude),
        data.localisationGPS.altitude != null
          ? Number(data.localisationGPS.altitude)
          : null,
        data.localisationGPS.precision != null
          ? Number(data.localisationGPS.precision)
          : null,
        horodatageLoc,
      ]
    );

    await conn.query(
      `INSERT INTO donnees_capteurs (id, temperature_ambiante, humidite, luminosite, temperature_corporelle, duree_conduite,
        horodatage, alerte_temperature, alerte_humidite, alerte_luminosite, alerte_temperature_corporelle, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        dcBuf,
        cap.temperatureAmbiante,
        cap.humidite,
        cap.luminosite,
        cap.temperatureCorporelle,
        cap.dureeConduite,
        horodatageDc,
        cap.alerteTemperature ? 1 : 0,
        cap.alerteHumidite ? 1 : 0,
        cap.alerteLuminosite ? 1 : 0,
        cap.alerteTemperatureCorporelle ? 1 : 0,
      ]
    );

    await conn.query(
      `INSERT INTO analyse_fatigue (id, yeux_fermes, ear, baillements, mar, inclinaison_tete, pitch, yaw,
        nombre_clignements, duree_yeux_fermes, nombre_baillements, niveau_vigilance, horodatage,
        alerte_yeux_fermes, alerte_baillements, alerte_inclinaison_tete, metadata, score_fatigue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        afBuf,
        ana.yeuxFermes ? 1 : 0,
        ana.ear,
        ana.baillements ? 1 : 0,
        ana.mar,
        ana.inclinaisonTete ? 1 : 0,
        ana.pitch,
        ana.yaw,
        ana.nombreClignements,
        ana.dureeYeuxFermes,
        ana.nombreBaillements,
        ana.niveauVigilance,
        horodatageAf,
        ana.alerteYeuxFermes ? 1 : 0,
        ana.alerteBaillements ? 1 : 0,
        ana.alerteInclinaisonTete ? 1 : 0,
        null,
        ana.scoreFatigue,
      ]
    );

    const conducteur = await findConducteur(conn, data.idConducteur);
    if (!conducteur) {
      await conn.rollback();
      return {
        status: 400,
        json: {
          success: false,
          error: 'No conducteur',
          message:
            'Aucun conducteur en base : créez un conducteur ou vérifiez idConducteur',
        },
      };
    }

    const conducteurBuf = conducteur.id;

    const alerteGeneree = niveauNecessiteAlerteFatigue(ana.niveauVigilance)
      ? 1
      : 0;
    const metaJson =
      data.metadata != null ? JSON.stringify(data.metadata) : null;

    await conn.query(
      `INSERT INTO paquet_donnees (id, id_conducteur, id_vehicule, id_sfam, niveau_vigilance, horodatage, received_at, metadata,
        traite, alerte_generee, donnees_capteurs_id, analyse_fatigue_id, localisation_gps_id, conducteur_id, vehicule_id, fatigue_event_id)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 0, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        paquetBuf,
        String(data.idConducteur),
        String(data.idVehicule),
        data.idSfam != null ? String(data.idSfam) : 'unknown',
        ana.niveauVigilance,
        horodatagePaquet,
        metaJson,
        alerteGeneree,
        dcBuf,
        afBuf,
        locBuf,
        conducteurBuf,
        vehiculeIdBuf,
      ]
    );

    const nb =
      data.niveauBatterie !== undefined ? Number(data.niveauBatterie) : null;
    const ti =
      data.temperatureInterne !== undefined
        ? Number(data.temperatureInterne)
        : null;
    const pe =
      data.portExterneConnecte !== undefined
        ? data.portExterneConnecte
          ? 1
          : 0
        : null;

    try {
      if (nb != null && ti != null && pe != null) {
        await conn.query(
          `UPDATE vehicule SET derniere_communication = NOW(), derniere_communication_module = NOW(),
           niveau_batterie = ?, temperature_interne = ?, port_externe_connecte = ?
           WHERE id = ?`,
          [nb, ti, pe, vehiculeIdBuf]
        );
      } else {
        await conn.query(
          `UPDATE vehicule SET derniere_communication = NOW(), derniere_communication_module = NOW() WHERE id = ?`,
          [vehiculeIdBuf]
        );
      }
    } catch {
      await conn.query(
        `UPDATE vehicule SET derniere_communication = NOW() WHERE id = ?`,
        [vehiculeIdBuf]
      );
    }

    if (ana.niveauVigilance === 'NORMAL') {
      await conn.query(
        `UPDATE alerte SET statut = 'resolue', resolue_at = NOW() WHERE vehicule_id = ? AND statut = 'active'`,
        [vehiculeIdBuf]
      );
    }

    let createdAlert = null;
    if (niveauNecessiteAlerteFatigue(ana.niveauVigilance)) {
      const idAlerte = `ALERT-${randomBytes(6).toString('hex').toUpperCase()}`;
      const alerteIdStr = newUuidString();
      const alerteIdBuf = uuidToBuffer(alerteIdStr);
      const msg = genererMessageAlerte(
        ana.niveauVigilance,
        scoreGlobal,
        conducteur.nom,
        vehicule.immatriculation
      );
      const metaAlerte = JSON.stringify({
        paquetId: paquetId,
        scoreGlobal,
        source: 'SFAM-Module',
        niveauVigilance: ana.niveauVigilance,
      });
      await conn.query(
        `INSERT INTO alerte (id, id_alerte, niveau, message, type, statut, horodatage, metadata, envoyee, lue, conducteur_id, vehicule_id, fatigue_event_id)
         VALUES (?, ?, ?, ?, ?, 'active', NOW(), ?, 0, 0, ?, ?, NULL)`,
        [
          alerteIdBuf,
          idAlerte.slice(0, 50),
          ana.niveauVigilance,
          msg,
          determineAlerteType(ana.niveauVigilance),
          metaAlerte,
          conducteurBuf,
          vehiculeIdBuf,
        ]
      );
      createdAlert = {
        id: alerteIdStr,
        idAlerte: idAlerte.slice(0, 50),
        niveau: ana.niveauVigilance,
        message: msg,
        type: determineAlerteType(ana.niveauVigilance),
        metadata: {
          paquetId,
          scoreGlobal,
          source: 'SFAM-Module',
          niveauVigilance: ana.niveauVigilance,
        },
      };
    }

    await verifierEtatModule(conn, vehiculeIdBuf, data);

    await conn.commit();

    // Réplication Firestore après commit MySQL (dual = edge ; firestore = même serveur qui écrit MySQL + lit le cloud pour le dashboard).
    const provider = getDataProvider();
    if (provider === 'dual' || provider === 'firestore') {
      const vehicleId = bufferToUuid(vehiculeIdBuf);
      const conducteurId = bufferToUuid(conducteurBuf);
      const moduleState = {
        niveauBatterie: data.niveauBatterie !== undefined ? Number(data.niveauBatterie) : null,
        temperatureInterne: data.temperatureInterne !== undefined ? Number(data.temperatureInterne) : null,
        portExterneConnecte:
          data.portExterneConnecte !== undefined ? Boolean(data.portExterneConnecte) : null,
        derniereCommunicationModule: formatNowLocalMysql(),
      };

      const ingestCtx = {
        vehicleId,
        vehicleImmatriculation: vehicule.immatriculation,
        conducteurId,
        conducteurNom: conducteur.nom,
        paquetId,
        locId,
        dcId,
        afId,
        horodatageLoc,
        horodatageDc,
        horodatageAf,
        horodatagePaquet,
        gps: {
          latitude: data.localisationGPS.latitude,
          longitude: data.localisationGPS.longitude,
          altitude: data.localisationGPS.altitude,
          precision: data.localisationGPS.precision,
        },
        capteurs: cap,
        analyse: ana,
        scoreGlobal,
        apiPayload: data,
        alerteGeneree: alerteGeneree === 1,
        createdAlert,
        resolveVehicleAlerts: ana.niveauVigilance === 'NORMAL',
        moduleState,
      };

      try {
        await replicateIngestToFirestore(ingestCtx);
      } catch (e) {
        console.warn('[ingest][firestore][replicate]', e?.message || e);
        try {
          const serial = JSON.parse(JSON.stringify(ingestCtx));
          await enqueueFirestoreSync('ingest', serial);
        } catch (enq) {
          console.warn('[ingest][firestore] outbox enqueue failed:', enq?.message || enq);
        }
      }
    }

    try {
      const { notifyAlertsChanged } = await import('../realtime/alertsHub.js');
      notifyAlertsChanged({ reason: 'ingest' });
    } catch (e) {
      console.warn('[ingest] notifyAlertsChanged', e?.message || e);
    }

    return {
      status: 201,
      json: {
        success: true,
        message: 'Paquet de données enregistré avec succès',
        data: {
          id: paquetId,
          idEvenement: paquetId,
          niveauVigilance: ana.niveauVigilance,
          scoreGlobal,
          alerteGeneree: alerteGeneree === 1,
          receivedAt: fmtMysql(new Date()),
        },
      },
    };
  } catch (e) {
    await conn.rollback();
    console.error('[ingestFatigueEvent]', e);
    return {
      status: 500,
      json: {
        success: false,
        error: 'Internal server error',
        message: e.message || 'Une erreur interne est survenue',
      },
    };
  } finally {
    conn.release();
  }
}
