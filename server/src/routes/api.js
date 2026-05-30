import { Router } from 'express';
import {
  requireDashboardAuth,
  getAuthFromApiKeyOrJwt,
  requireVehicleModuleApiKey,
} from '../middleware/dashboardAuth.js';
import { ok, fail } from '../utils/jsonResponse.js';
import { bufferToUuid } from '../utils/uuid.js';
import { loginDashboardUser } from '../services/dashboardLogin.js';
import { validateDriverRfidForVehicle } from '../services/rfidDriverValidation.js';
import {
  addAlertsSseClient,
  removeAlertsSseClient,
  notifyAlertsChanged,
} from '../realtime/alertsHub.js';
import {
  listVehicles,
  listVehiclesForMap,
  updateVehicle,
  createVehicle,
  deleteVehicle,
} from '../services/vehiculeService.js';
import {
  getGlobalStatistics,
  getStatisticsSummaryForAuth,
  isSupervisorAuth,
  isAdminAuth,
} from '../services/statisticsService.js';
import {
  listAlertes,
  acquitterAlerte,
  resoudreAlerte,
} from '../services/alertsService.js';
import { listModuleAlerts } from '../services/moduleAlertsService.js';
import {
  listConducteurs,
  getConducteurStatistics,
  createConducteur,
  updateConducteur,
  deleteConducteur,
} from '../services/conducteurService.js';
import {
  getVehicleDeepStats,
  getDriverDeepStats,
} from '../services/entityDeepStatsService.js';

const router = Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { login, password } = req.body || {};
    const result = await loginDashboardUser(login, password);
    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Identifiant ou mot de passe incorrect',
      });
    }
    res.json(
      ok(
        {
          token: result.token,
          role: result.role,
          login: result.login,
        },
        'Connexion réussie'
      )
    );
  } catch (err) {
    console.error('[POST /auth/login]', err);
    const { body, statusCode } = fail(
      'Internal server error',
      err.message,
      500
    );
    res.status(statusCode).json(body);
  }
});

/**
 * Module embarqué : présente la carte RFID pour confirmer le conducteur affecté au véhicule.
 * Auth : X-API-KEY = clé du véhicule (pas la clé siège).
 */
router.post('/vehicle/validate-rfid', requireVehicleModuleApiKey, async (req, res) => {
  try {
    const { rfidUid } = req.body || {};
    const vid = req.dashboardAuth.vehicleId;
    const vidStr = typeof vid === 'string' ? vid : bufferToUuid(vid);
    const data = await validateDriverRfidForVehicle(vidStr, rfidUid);
    res.json(ok(data));
  } catch (err) {
    if (err.code === 'VALIDATION') {
      return res.status(400).json({
        success: false,
        error: 'Validation',
        message: err.message,
      });
    }
    if (err.code === 'RFID_FIRESTORE_ONLY') {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: err.message,
      });
    }
    console.error('[POST /vehicle/validate-rfid]', err);
    const { body, statusCode } = fail(
      'Internal server error',
      err.message,
      500
    );
    res.status(statusCode).json(body);
  }
});

/**
 * SSE : flux temps réel pour le tableau de bord superviseur.
 * EventSource ne peut pas envoyer d'en-têtes → ?api_key= ou ?token= (JWT).
 */
router.get('/alerts/stream', async (req, res) => {
  const auth = await getAuthFromApiKeyOrJwt(req.query);
  if (!auth || !isSupervisorAuth(auth)) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message:
        'Jeton dashboard (?token=) ou clé API siège requise (?api_key=), comme pour les alertes',
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  res.write(': sfam-alerts-stream\n\n');
  addAlertsSseClient(res);

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeAlertsSseClient(res);
  });
});

router.use(requireDashboardAuth);

/** CRUD véhicules en premier (évite toute ambiguïté ; build avec en-tête X-SFAM-Vehicles-CRUD). */
router.post('/vehicles', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    const data = await createVehicle(req.body || {});
    res.setHeader('X-SFAM-Vehicles-CRUD', 'post-v1');
    res.json(ok(data, 'Véhicule créé avec succès'));
  } catch (err) {
    if (err.code === 'VALIDATION') {
      return res.status(400).json({
        success: false,
        error: 'Validation',
        message: err.message,
      });
    }
    if (err.code === 'DUPLICATE') {
      return res.status(400).json({
        success: false,
        error: 'Duplicate',
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[POST /vehicles]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.put('/vehicles/:id', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    const data = await updateVehicle(req.params.id, req.body || {});
    res.setHeader('X-SFAM-Vehicles-CRUD', 'put-v1');
    res.json(ok(data, 'Véhicule mis à jour avec succès'));
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé',
        message: 'Véhicule non trouvé',
      });
    }
    if (err.code === 'INVALID_ID') {
      return res.status(400).json({
        success: false,
        error: 'Invalid id',
        message: err.message,
      });
    }
    if (err.code === 'DUPLICATE') {
      return res.status(400).json({
        success: false,
        error: 'Duplicate',
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[PUT /vehicles/:id]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.delete('/vehicles/:id', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    await deleteVehicle(req.params.id);
    res.setHeader('X-SFAM-Vehicles-CRUD', 'delete-v1');
    res.json(ok(undefined, 'Véhicule supprimé avec succès'));
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Véhicule non trouvé',
        message: 'Véhicule non trouvé',
      });
    }
    if (err.code === 'INVALID_ID') {
      return res.status(400).json({
        success: false,
        error: 'Invalid id',
        message: err.message,
      });
    }
    if (err.code === 'FORBIDDEN_DELETE_SUPERVISOR') {
      return res.status(400).json({
        success: false,
        error: 'Accès refusé',
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[DELETE /vehicles/:id]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

async function sendAlertsList(req, res, idVehicule) {
  try {
    const result = await listAlertes(req, idVehicule);
    res.json(ok(result));
  } catch (err) {
    if (err.code === 'FORBIDDEN_GLOBAL_ALERTS' || err.code === 'FORBIDDEN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message:
          err.code === 'FORBIDDEN_GLOBAL_ALERTS'
            ? "L'endpoint global des alertes est réservé au superviseur"
            : 'Accès refusé',
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /alerts]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
}

router.get('/statistics/global', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Statistiques globales réservées à l’administrateur',
      });
    }
    const data = await getGlobalStatistics();
    res.json(ok(data));
  } catch (err) {
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /statistics/global]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const data = await getStatisticsSummaryForAuth(req.dashboardAuth);
    res.json(ok(data));
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: err.message || 'Accès refusé',
      });
    }
    if (err.code === 'VEHICLE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
        message: 'Véhicule non trouvé',
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /statistics]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

/** Liste des alertes (page /alerts : GET sans suffixe = même logique que /alerts/global ou véhicule courant). */
router.get('/alerts', (req, res) => {
  const auth = req.dashboardAuth;
  const idParam = isSupervisorAuth(auth)
    ? 'global'
    : auth.kind === 'vehicle'
      ? bufferToUuid(auth.vehicleId)
      : null;
  if (idParam == null) {
    return res.status(403).json({
      success: false,
      error: 'Accès refusé',
      message: 'Authentification véhicule requise',
    });
  }
  return sendAlertsList(req, res, idParam);
});

router.get('/alerts/:idVehicule', (req, res) =>
  sendAlertsList(req, res, req.params.idVehicule)
);

router.post('/alerts/:id/acquitter', async (req, res) => {
  try {
    const { data, message } = await acquitterAlerte(req, req.params.id);
    notifyAlertsChanged({ reason: 'acquittee' });
    res.json(ok(data, message));
  } catch (err) {
    if (err.code === 'SUPERVISOR_ONLY') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Seul un superviseur peut acquitter des alertes',
      });
    }
    if (err.code === 'ALERTE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Alerte non trouvée',
        message: 'Alerte non trouvée',
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[POST /alerts/:id/acquitter]', err);
    const { body, statusCode } = fail(
      'Erreur lors de l\'acquittement',
      err.message,
      500
    );
    res.status(statusCode).json(body);
  }
});

router.post('/alerts/:id/resoudre', async (req, res) => {
  try {
    const { data, message } = await resoudreAlerte(req, req.params.id);
    notifyAlertsChanged({ reason: 'resolue' });
    res.json(ok(data, message));
  } catch (err) {
    if (err.code === 'SUPERVISOR_ONLY') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Accès refusé',
      });
    }
    if (err.code === 'ALERTE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Alerte non trouvée',
        message: 'Alerte non trouvée',
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[POST /alerts/:id/resoudre]', err);
    const { body, statusCode } = fail(
      'Erreur lors de la résolution',
      err.message,
      500
    );
    res.status(statusCode).json(body);
  }
});

router.get('/vehicles', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Liste des véhicules réservée à l’administrateur',
      });
    }
    const vehicules = await listVehicles();
    res.json(
      ok({
        total: vehicules.length,
        vehicules,
      })
    );
  } catch (err) {
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /vehicles]', err);
    const { body, statusCode } = fail(
      'Internal server error',
      err.message,
      500
    );
    res.status(statusCode).json(body);
  }
});

router.get('/vehicles/map', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Carte flotte réservée à l’administrateur',
      });
    }
    const vehicles = await listVehiclesForMap(req.dashboardAuth);
    res.json(
      ok({
        total: vehicles.length,
        vehicles,
      })
    );
  } catch (err) {
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /vehicles/map]', err);
    const { body, statusCode } = fail(
      'Internal server error',
      err.message,
      500
    );
    res.status(statusCode).json(body);
  }
});

router.get('/vehicles/deep-stats/:vehicleId', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Statistiques détaillées réservées à l’administrateur',
      });
    }
    const data = await getVehicleDeepStats(req.params.vehicleId);
    res.json(ok(data));
  } catch (err) {
    if (err.code === 'NOT_FOUND' || err.code === 'INVALID_ID') {
      return res.status(err.code === 'INVALID_ID' ? 400 : 404).json({
        success: false,
        error: err.code,
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /vehicles/deep-stats/:vehicleId]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.get('/conducteurs/deep-stats/:conducteurId', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Statistiques détaillées réservées à l’administrateur',
      });
    }
    const data = await getDriverDeepStats(req.params.conducteurId);
    res.json(ok(data));
  } catch (err) {
    if (err.code === 'NOT_FOUND' || err.code === 'INVALID_ID') {
      return res.status(err.code === 'INVALID_ID' ? 400 : 404).json({
        success: false,
        error: err.code,
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /conducteurs/deep-stats/:conducteurId]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.get('/conducteurs/stats', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    const data = await getConducteurStatistics();
    res.json(ok(data));
  } catch (err) {
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /conducteurs/stats]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.get('/conducteurs', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    const conducteurs = await listConducteurs();
    res.json(ok({ total: conducteurs.length, conducteurs }));
  } catch (err) {
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /conducteurs]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.post('/conducteurs', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    const data = await createConducteur(req.body || {});
    res.json(ok(data, 'Conducteur créé'));
  } catch (err) {
    if (err.code === 'VALIDATION' || err.code === 'DUPLICATE') {
      return res.status(400).json({
        success: false,
        error: err.code,
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[POST /conducteurs]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.put('/conducteurs/:id', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    const data = await updateConducteur(req.params.id, req.body || {});
    res.json(ok(data, 'Conducteur mis à jour'));
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Conducteur introuvable',
      });
    }
    if (err.code === 'VALIDATION' || err.code === 'DUPLICATE' || err.code === 'INVALID_ID') {
      return res.status(400).json({
        success: false,
        error: err.code,
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[PUT /conducteurs/:id]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.delete('/conducteurs/:id', async (req, res) => {
  try {
    if (!isAdminAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé à l’administrateur',
      });
    }
    await deleteConducteur(req.params.id);
    res.json(ok(undefined, 'Conducteur supprimé'));
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Conducteur introuvable',
      });
    }
    if (err.code === 'INVALID_ID') {
      return res.status(400).json({
        success: false,
        error: 'Invalid id',
        message: err.message,
      });
    }
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[DELETE /conducteurs/:id]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.get('/module-alerts', async (req, res) => {
  try {
    if (!isSupervisorAuth(req.dashboardAuth)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé',
        message: 'Réservé au superviseur',
      });
    }
    const data = await listModuleAlerts();
    res.json(ok(data));
  } catch (err) {
    if (err.message === 'NO_DATABASE') {
      const { body, statusCode } = fail(
        'Service unavailable',
        'Base de données non configurée (DATABASE_URL)',
        503
      );
      return res.status(statusCode).json(body);
    }
    console.error('[GET /module-alerts]', err);
    const { body, statusCode } = fail('Internal server error', err.message, 500);
    res.status(statusCode).json(body);
  }
});

router.get('/settings', (req, res) => {
  const { body, statusCode } = fail('Not implemented', null, 501);
  res.status(statusCode).json(body);
});

router.put('/settings', (req, res) => {
  const { body, statusCode } = fail('Not implemented', null, 501);
  res.status(statusCode).json(body);
});

router.post('/settings/api-key', (req, res) => {
  const { body, statusCode } = fail('Not implemented', null, 501);
  res.status(statusCode).json(body);
});

export default router;
