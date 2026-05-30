import { getFirestore } from '../../config/firebase.js';

function formatDt(v) {
  if (v == null) return '';
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

export async function listModuleAlertsFs() {
  const db = getFirestore();
  const snap = await db
    .collection('moduleAlerts')
    .where('statut', '==', 'active')
    .limit(80)
    .get();

  const sorted = snap.docs.sort(
    (a, b) =>
      horodatageMs(b.data()?.horodatage) - horodatageMs(a.data()?.horodatage)
  );
  const top = sorted.slice(0, 50);

  const immatByVid = new Map();
  const vSnap = await db.collection('vehicles').get().catch(() => ({ docs: [] }));
  for (const d of vSnap.docs) {
    const dd = d.data() || {};
    if (dd.immatriculation) immatByVid.set(d.id, dd.immatriculation);
  }

  const alertes = top.map((doc) => {
    const row = doc.data() || {};
    const vid = row.vehiculeId;
    return {
      id: doc.id,
      vehicule: {
        id: vid ? String(vid) : '',
        immatriculation: immatByVid.get(vid) || row.vehicule?.immatriculation || '?',
      },
      type: row.type,
      message: row.message,
      statut: row.statut,
      horodatage: formatDt(row.horodatage),
    };
  });

  return { total: alertes.length, alertes };
}
