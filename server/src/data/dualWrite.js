import { getDataProvider } from './provider.js';
import { enqueueFirestoreSync } from './firestoreOutbox.js';

/**
 * Dual-write helper.
 *
 * En mode `dual`, on exécute la source principale (souvent MySQL) puis une réplication Firestore.
 * - Si Firestore échoue, on log et on garde la réponse MySQL (app reste fonctionnelle).
 * - Option `enqueuePayload` : sérialise l'opération dans MySQL (`firestore_sync_queue`) pour
 *   synchronisation automatique quand Firebase revient.
 * - Si la source principale échoue, on remonte l'erreur (comportement identique à aujourd'hui).
 */
export async function dualWrite(
  primaryFn,
  secondaryFn,
  label = 'dualWrite',
  options = {}
) {
  const { enqueuePayload } = options;
  const provider = getDataProvider();
  if (provider !== 'dual') {
    // Not dual: caller should route based on provider.
    return primaryFn();
  }

  const out = await primaryFn();
  try {
    await secondaryFn(out);
  } catch (e) {
    console.warn(`[${label}] secondary write failed:`, e?.message || e);
    if (enqueuePayload) {
      try {
        const payload =
          typeof enqueuePayload === 'function' ? enqueuePayload(out) : enqueuePayload;
        await enqueueFirestoreSync(label, payload);
      } catch (enqErr) {
        console.warn(`[${label}] outbox enqueue failed:`, enqErr?.message || enqErr);
      }
    }
  }
  return out;
}

