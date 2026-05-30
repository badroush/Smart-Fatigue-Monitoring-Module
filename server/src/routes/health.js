import { Router } from 'express';
import { getPool } from '../config/database.js';
import { ok } from '../utils/jsonResponse.js';
import { getDataProvider } from '../data/provider.js';
import { getFirestore } from '../config/firebase.js';

const router = Router();

router.get('/health', async (req, res) => {
  const provider = getDataProvider();
  let database = 'not_configured';
  let firestore = 'not_configured';

  if (provider === 'firestore') {
    database = 'skipped_firestore_mode';
    try {
      getFirestore();
      firestore = 'ok';
    } catch {
      firestore = 'error';
    }
  } else {
    const pool = getPool();
    if (pool) {
      try {
        await pool.query('SELECT 1');
        database = 'ok';
      } catch {
        database = 'error';
      }
    }
    if (provider === 'dual') {
      try {
        getFirestore();
        firestore = 'ok';
      } catch {
        firestore = 'error';
      }
    }
  }

  res.json(ok({ status: 'ok', dataProvider: provider, database, firestore }));
});

export default router;
