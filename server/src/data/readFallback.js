import { getPool } from '../config/database.js';
import { getDataProvider } from './provider.js';

/**
 * Siège / test sans MySQL : en `firestore` tout lit le cloud.
 * En `dual`, tant que MySQL répond on lit MySQL ; si le pool est absent (`DATABASE_URL` vide),
 * on retombe sur Firestore pour que le dashboard superviseur reste utilisable.
 *
 * Si MySQL est arrêté mais `DATABASE_URL` est encore défini, le pool existe quand même :
 * mets `FORCE_FIRESTORE_READS=1` le temps du test, ou enlève `DATABASE_URL`, ou passe en
 * `DATA_PROVIDER=firestore` sur la machine du siège.
 */
export function readFromFirestore() {
  if (process.env.FORCE_FIRESTORE_READS === '1') return true;
  const p = getDataProvider();
  if (p === 'firestore') return true;
  if (p === 'dual' && !getPool()) return true;
  return false;
}
