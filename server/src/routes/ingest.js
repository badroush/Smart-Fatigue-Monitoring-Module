import { Router } from 'express';
import { fail } from '../utils/jsonResponse.js';
import { ingestFatigueEvent } from '../services/fatigueIngestService.js';

/**
 * Module embarqué : header X-API-KEY = vehicule.sfam_api_key (pas la clé superviseur).
 */
const router = Router();

router.get('/ingest-info', (req, res) => {
  res.json({
    success: true,
    build: 'sfam-express-ingest-v3-conducteurs',
    postEndpoint: 'POST /api/fatigue-events',
    dashboardCrud:
      'POST/PUT/DELETE /api/vehicles (réponse doit contenir X-SFAM-Vehicles-CRUD: post-v1|put-v1|delete-v1)',
    conducteursCrud:
      'GET/POST /api/conducteurs | GET /api/conducteurs/stats | PUT/DELETE /api/conducteurs/:id',
    note:
      'Si 404 sur /api/conducteurs ou "Migration Express", une ancienne instance Node tourne : arrêtez tous les processus node (Task Manager) et relancez depuis server/ (npm run dev).',
  });
});

router.post('/fatigue-events', async (req, res) => {
  try {
    res.setHeader('X-SFAM-Ingest-Build', 'sfam-express-ingest-v3-conducteurs');
    const result = await ingestFatigueEvent({
      body: req.body,
      headers: req.headers,
    });
    res.status(result.status).json(result.json);
  } catch (e) {
    console.error('[POST /fatigue-events]', e);
    const { body, statusCode } = fail(
      'Internal server error',
      e.message || 'Erreur serveur',
      500
    );
    res.status(statusCode).json(body);
  }
});

export default router;
