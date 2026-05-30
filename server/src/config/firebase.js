import admin from 'firebase-admin';
import fs from 'node:fs';

let app = null;

function parseServiceAccount() {
  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (p && p.trim()) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      const err = new Error('Invalid FIREBASE_SERVICE_ACCOUNT_PATH');
      err.cause = e;
      throw err;
    }
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      const err = new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
      err.cause = e;
      throw err;
    }
  }
  return null;
}

/**
 * Firebase Admin (lazy init).
 *
 * Env attendu:
 * - FIREBASE_PROJECT_ID (optionnel si fourni dans service account)
 * - FIREBASE_SERVICE_ACCOUNT_PATH (chemin vers serviceAccountKey.json)
 * - FIREBASE_SERVICE_ACCOUNT_JSON (JSON string du service account)
 *
 * Notes:
 * - On initialise uniquement si DATA_PROVIDER=firestore (ou si un service account est présent).
 */
export function getFirestore() {
  if (app) return admin.firestore(app);

  const serviceAccount = parseServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id;

  if (!serviceAccount) {
    const err = new Error('FIREBASE_NOT_CONFIGURED');
    err.code = 'FIREBASE_NOT_CONFIGURED';
    throw err;
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });

  const db = admin.firestore(app);
  // Recommended: ignore undefined to make migrations simpler.
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

