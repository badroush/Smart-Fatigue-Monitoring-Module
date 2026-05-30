import { getFirestore } from '../../config/firebase.js';
import { niveauVigilanceToJson } from '../../utils/niveauVigilance.js';
import { bufferToUuid } from '../../utils/uuid.js';

function vehicleIdStr(id) {
  if (id == null) return '';
  return Buffer.isBuffer(id) ? bufferToUuid(id) : String(id);
}

function formatDt(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v.toDate) {
    const d = v.toDate();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  return String(v);
}

/** Pour tri sans index composite (Timestamp | Date | string). */
function horodatageMs(v) {
  if (v == null) return 0;
  if (typeof v === 'object' && v.toDate) return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const d = new Date(v.includes('T') ? v : v.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

function mapAlertDoc(id, a) {
  return {
    id,
    idAlerte: a.idAlerte || a.id_alerte || id,
    conducteur: a.conducteur,
    vehicule: a.vehicule,
    niveau: niveauVigilanceToJson(a.niveau),
    message: a.message,
    type: a.type,
    statut: a.statut,
    horodatage: formatDt(a.horodatage),
    acquitteeAt: a.acquitteeAt ? formatDt(a.acquitteeAt) : undefined,
    resolueAt: a.resolueAt ? formatDt(a.resolueAt) : undefined,
    acquitteePar: a.acquitteePar ?? undefined,
    resoluePar: a.resoluePar ?? undefined,
    envoyee: Boolean(a.envoyee),
    lue: Boolean(a.lue),
    estCritique: String(a.niveau) === 'SOMNOLENCE_CRITIQUE',
  };
}

export async function listAlertes(req, idVehiculeParam, { isSupervisorAuth }) {
  const auth = req.dashboardAuth;
  const idVehicule = idVehiculeParam;

  if (idVehicule === 'global' && !isSupervisorAuth(auth)) {
    const err = new Error('FORBIDDEN_GLOBAL_ALERTS');
    err.code = 'FORBIDDEN_GLOBAL_ALERTS';
    throw err;
  }

  const db = getFirestore();
  // Une seule clause d'égalité sur `statut` évite l'index composite (statut + horodatage).
  // Filtre véhicule + tri par date se font en mémoire (volume raisonnable pour le dashboard).
  const snap = await db
    .collection('alerts')
    .where('statut', '==', 'active')
    .limit(500)
    .get();

  let rows = snap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));

  if (!isSupervisorAuth(auth)) {
    if (auth.kind !== 'vehicle') {
      const err = new Error('FORBIDDEN');
      err.code = 'FORBIDDEN';
      throw err;
    }
    const myVid = vehicleIdStr(auth.vehicleId);
    if (idVehicule !== 'global' && idVehicule !== myVid) {
      const err = new Error('FORBIDDEN');
      err.code = 'FORBIDDEN';
      throw err;
    }
    rows = rows.filter(({ data }) => String(data.vehiculeId) === myVid);
  }

  rows.sort(
    (a, b) => horodatageMs(b.data.horodatage) - horodatageMs(a.data.horodatage)
  );
  rows = rows.slice(0, 100);

  const alertes = rows.map(({ id, data }) => mapAlertDoc(id, data));
  return { total: alertes.length, alertes };
}

export async function acquitterAlerte(id, { acquitteeAt, acquitteePar }) {
  const db = getFirestore();
  const ref = db.collection('alerts').doc(String(id));
  await ref.set(
    {
      acquitteeAt: acquitteeAt || new Date(),
      acquitteePar: acquitteePar || null,
      lue: true,
    },
    { merge: true }
  );
}

export async function resoudreAlerte(id, { resolueAt, resoluePar }) {
  const db = getFirestore();
  const ref = db.collection('alerts').doc(String(id));
  await ref.set(
    {
      statut: 'resolue',
      resolueAt: resolueAt || new Date(),
      resoluePar: resoluePar || null,
    },
    { merge: true }
  );
}

