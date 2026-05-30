import admin from 'firebase-admin';
import { getFirestore } from '../../config/firebase.js';
import { severityFromNiveau } from './util.js';

function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function dtToFirestore(v) {
  if (!v) return null;
  // We keep string `YYYY-MM-DD HH:mm:ss` in MySQL. Store as Timestamp for queries.
  // If already Date, store as Timestamp too.
  if (v instanceof Date) return admin.firestore.Timestamp.fromDate(v);
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      const d = new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6])
      );
      return admin.firestore.Timestamp.fromDate(d);
    }
    const d2 = new Date(v);
    if (!Number.isNaN(d2.getTime())) return admin.firestore.Timestamp.fromDate(d2);
  }
  return admin.firestore.Timestamp.fromDate(new Date());
}

async function upsertModuleAlert(db, vehicleId, type, { active, message, horodatage }) {
  const id = `${vehicleId}_${type}`;
  const ref = db.collection('moduleAlerts').doc(id);
  if (active) {
    await ref.set(
      {
        type,
        message: String(message || '').slice(0, 255),
        statut: 'active',
        vehiculeId: String(vehicleId),
        horodatage: dtToFirestore(horodatage) || dtToFirestore(nowIso()),
        resolueAt: null,
      },
      { merge: true }
    );
  } else {
    await ref.set(
      {
        statut: 'resolue',
        resolueAt: admin.firestore.Timestamp.fromDate(new Date()),
      },
      { merge: true }
    );
  }
}

/**
 * Réplication Firestore (best-effort) d'un ingest MySQL déjà committé.
 * On utilise les mêmes IDs UUID (string) que MySQL pour retrouver/aligner les entités.
 */
export async function replicateIngestToFirestore(ctx) {
  const db = getFirestore();

  const {
    vehicleId,
    vehicleImmatriculation,
    conducteurId,
    conducteurNom,
    paquetId,
    locId,
    dcId,
    afId,
    horodatageLoc,
    horodatageDc,
    horodatageAf,
    horodatagePaquet,
    gps,
    capteurs,
    analyse,
    scoreGlobal,
    apiPayload,
    alerteGeneree,
    createdAlert,
    resolveVehicleAlerts,
    moduleState,
  } = ctx;

  const batch = db.batch();

  // GPS
  batch.set(
    db.collection('gps').doc(String(locId)),
    {
      latitude: Number(gps.latitude),
      longitude: Number(gps.longitude),
      altitude: gps.altitude != null ? Number(gps.altitude) : null,
      precision: gps.precision != null ? Number(gps.precision) : null,
      horodatage: dtToFirestore(horodatageLoc),
      vehiculeId: String(vehicleId),
      paquetId: String(paquetId),
    },
    { merge: true }
  );

  // Sensors
  batch.set(
    db.collection('sensors').doc(String(dcId)),
    {
      temperatureAmbiante: Number(capteurs.temperatureAmbiante),
      humidite: Number(capteurs.humidite),
      luminosite: Number(capteurs.luminosite),
      temperatureCorporelle: Number(capteurs.temperatureCorporelle),
      dureeConduite: Number(capteurs.dureeConduite),
      horodatage: dtToFirestore(horodatageDc),
      alertes: {
        temperature: Boolean(capteurs.alerteTemperature),
        humidite: Boolean(capteurs.alerteHumidite),
        luminosite: Boolean(capteurs.alerteLuminosite),
        temperatureCorporelle: Boolean(capteurs.alerteTemperatureCorporelle),
      },
      vehiculeId: String(vehicleId),
      paquetId: String(paquetId),
    },
    { merge: true }
  );

  // Fatigue analysis
  batch.set(
    db.collection('fatigueAnalyses').doc(String(afId)),
    {
      yeuxFermes: Boolean(analyse.yeuxFermes),
      ear: Number(analyse.ear),
      baillements: Boolean(analyse.baillements),
      mar: Number(analyse.mar),
      inclinaisonTete: Boolean(analyse.inclinaisonTete),
      pitch: Number(analyse.pitch),
      yaw: Number(analyse.yaw),
      nombreClignements: Number(analyse.nombreClignements),
      dureeYeuxFermes: Number(analyse.dureeYeuxFermes),
      nombreBaillements: Number(analyse.nombreBaillements),
      niveauVigilance: String(analyse.niveauVigilance),
      scoreFatigue: Number(analyse.scoreFatigue),
      horodatage: dtToFirestore(horodatageAf),
      alertes: {
        yeuxFermes: Boolean(analyse.alerteYeuxFermes),
        baillements: Boolean(analyse.alerteBaillements),
        inclinaisonTete: Boolean(analyse.alerteInclinaisonTete),
      },
      vehiculeId: String(vehicleId),
      paquetId: String(paquetId),
    },
    { merge: true }
  );

  // Packet (paquet_donnees)
  batch.set(
    db.collection('packets').doc(String(paquetId)),
    {
      idConducteur: String(apiPayload.idConducteur),
      idVehicule: String(apiPayload.idVehicule),
      idSfam: apiPayload.idSfam != null ? String(apiPayload.idSfam) : 'unknown',
      niveauVigilance: String(analyse.niveauVigilance),
      horodatage: dtToFirestore(horodatagePaquet),
      receivedAt: admin.firestore.Timestamp.fromDate(new Date()),
      scoreGlobal: Number(scoreGlobal),
      metadata: apiPayload.metadata ?? null,
      alerteGeneree: Boolean(alerteGeneree),
      refs: {
        localisationGpsId: String(locId),
        donneesCapteursId: String(dcId),
        analyseFatigueId: String(afId),
      },
      vehiculeId: String(vehicleId),
      conducteurId: String(conducteurId),
    },
    { merge: true }
  );

  // Vehicle (last position + last update)
  batch.set(
    db.collection('vehicles').doc(String(vehicleId)),
    {
      immatriculation: vehicleImmatriculation,
      lastPosition: [Number(gps.latitude), Number(gps.longitude)],
      lastUpdate: nowIso(),
      lastNiveauVigilance: String(analyse.niveauVigilance),
      activeAlertSeverity: severityFromNiveau(analyse.niveauVigilance),
      derniereCommunication: nowIso(),
      module: moduleState ?? null,
    },
    { merge: true }
  );

  // Alerts
  if (createdAlert) {
    batch.set(
      db.collection('alerts').doc(String(createdAlert.id)),
      {
        idAlerte: createdAlert.idAlerte,
        niveau: createdAlert.niveau,
        message: createdAlert.message,
        type: createdAlert.type,
        statut: 'active',
        horodatage: admin.firestore.Timestamp.fromDate(new Date()),
        metadata: createdAlert.metadata ?? null,
        envoyee: false,
        lue: false,
        vehiculeId: String(vehicleId),
        conducteurId: String(conducteurId),
        vehicule: { id: String(vehicleId), immatriculation: vehicleImmatriculation },
        conducteur: { id: String(conducteurId), nom: conducteurNom, numeroPermis: String(apiPayload.idConducteur) },
      },
      { merge: true }
    );
  }

  await batch.commit();

  // Extra writes requiring queries (best-effort).
  if (resolveVehicleAlerts) {
    const snap = await db
      .collection('alerts')
      .where('statut', '==', 'active')
      .where('vehiculeId', '==', String(vehicleId))
      .get();
    if (!snap.empty) {
      const b2 = db.batch();
      for (const doc of snap.docs) {
        b2.set(
          doc.ref,
          { statut: 'resolue', resolueAt: admin.firestore.Timestamp.fromDate(new Date()) },
          { merge: true }
        );
      }
      await b2.commit();
    }
    await db
      .collection('vehicles')
      .doc(String(vehicleId))
      .set({ activeAlertSeverity: 0 }, { merge: true });
  }

  // Module alerts (battery / overheating / port disconnected)
  if (moduleState) {
    const { niveauBatterie, temperatureInterne, portExterneConnecte } = moduleState;
    if (niveauBatterie != null) {
      const n = Number(niveauBatterie);
      await upsertModuleAlert(db, vehicleId, 'batterie_faible', {
        active: n < 20,
        message: `Batterie critique (${n}%)`,
        horodatage: nowIso(),
      });
    }
    if (temperatureInterne != null) {
      const t = Number(temperatureInterne);
      await upsertModuleAlert(db, vehicleId, 'surchauffe', {
        active: t > 70,
        message: `Surchauffe du module (${t.toFixed(1)}°C)`,
        horodatage: nowIso(),
      });
    }
    if (portExterneConnecte != null) {
      const p = Boolean(portExterneConnecte);
      await upsertModuleAlert(db, vehicleId, 'port_deconnecte', {
        active: !p,
        message: 'Port externe déconnecté - Module partiellement opérationnel',
        horodatage: nowIso(),
      });
    }
  }
}

