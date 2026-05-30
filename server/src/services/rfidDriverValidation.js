import { getFirestore } from '../config/firebase.js';
import { readFromFirestore } from '../data/readFallback.js';

/**
 * Le module du camion envoie la clé API du véhicule + l’UID RFID.
 * On vérifie qu’un conducteur est affecté à ce véhicule et que la carte correspond.
 */
export async function validateDriverRfidForVehicle(vehicleIdStr, rfidUidRaw) {
  const rfidUid = String(rfidUidRaw || '')
    .trim()
    .toUpperCase();
  if (!rfidUid) {
    const e = new Error('UID RFID requis');
    e.code = 'VALIDATION';
    throw e;
  }

  if (!readFromFirestore()) {
    const e = new Error(
      'Validation RFID disponible uniquement avec DATA_PROVIDER=firestore (ou FORCE_FIRESTORE_READS)'
    );
    e.code = 'RFID_FIRESTORE_ONLY';
    throw e;
  }

  const db = getFirestore();
  const vid = String(vehicleIdStr);
  const snap = await db
    .collection('drivers')
    .where('vehiculeAssigneId', '==', vid)
    .limit(25)
    .get();

  let matched = null;
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const card = String(d.rfidUid || '')
      .trim()
      .toUpperCase();
    if (card && card === rfidUid) {
      matched = { id: doc.id, ...d };
      break;
    }
  }

  if (!matched) {
    return {
      valid: false,
      message:
        'Carte non reconnue ou conducteur non affecté à ce véhicule pour ce module',
    };
  }

  return {
    valid: true,
    conducteur: {
      id: matched.id,
      nom: matched.nom,
      numeroPermis: matched.numeroPermis,
      vehiculeAssigneId: matched.vehiculeAssigneId ?? vid,
    },
  };
}
