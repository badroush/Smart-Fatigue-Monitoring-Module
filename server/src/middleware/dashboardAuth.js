import { getPool } from '../config/database.js';
import { fail } from '../utils/jsonResponse.js';
import { getDataProvider } from '../data/provider.js';
import { findVehicleAuthByApiKey } from '../data/firestore/vehicles.js';
import { verifyDashboardToken } from '../services/authTokens.js';

/**
 * Résout une clé X-API-KEY vers le même objet que req.dashboardAuth (sans JWT).
 */
export async function resolveDashboardAuthFromApiKey(key) {
  if (!key || typeof key !== 'string') return null;

  const envKey = process.env.SUPERVISOR_API_KEY;
  if (envKey && key === envKey) {
    return { kind: 'supervisor_env', isSuperviseur: true };
  }

  if (getDataProvider() === 'firestore') {
    try {
      return await findVehicleAuthByApiKey(key);
    } catch (err) {
      console.error('[resolveDashboardAuthFromApiKey][firestore]', err);
      throw err;
    }
  }

  const pool = getPool();
  if (!pool) return null;

  try {
    let rows;
    try {
      const [r] = await pool.query(
        `SELECT id, COALESCE(is_superviseur, 0) AS is_superviseur
         FROM vehicule WHERE sfam_api_key = ? LIMIT 1`,
        [key]
      );
      rows = r;
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR' || e.errno === 1054) {
        const [r] = await pool.query(
          `SELECT id, 0 AS is_superviseur FROM vehicule WHERE sfam_api_key = ? LIMIT 1`,
          [key]
        );
        rows = r;
      } else {
        throw e;
      }
    }

    if (!rows.length) return null;

    const row = rows[0];
    return {
      kind: 'vehicle',
      vehicleId: row.id,
      isSuperviseur: Boolean(row.is_superviseur),
    };
  } catch (err) {
    console.error('[resolveDashboardAuthFromApiKey]', err);
    throw err;
  }
}

/**
 * Bearer JWT (admin / superviseur) OU X-API-KEY (comportement historique).
 */
export async function requireDashboardAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (
    authHeader &&
    typeof authHeader === 'string' &&
    authHeader.startsWith('Bearer ')
  ) {
    const token = authHeader.slice(7).trim();
    const payload = verifyDashboardToken(token);
    if (!payload?.sub || !payload.role) {
      const { body, statusCode } = fail(
        'Unauthorized',
        'Jeton invalide ou expiré',
        401
      );
      return res.status(statusCode).json(body);
    }
    const role = payload.role === 'superviseur' ? 'superviseur' : 'admin';
    req.dashboardAuth = {
      kind: 'user',
      userId: String(payload.sub),
      login: String(payload.login || ''),
      role,
    };
    return next();
  }

  const key = req.headers['x-api-key'];
  if (!key) {
    const { body, statusCode } = fail(
      'Missing credentials',
      "Jeton Bearer ou en-tête X-API-KEY requis",
      401
    );
    return res.status(statusCode).json(body);
  }

  try {
    const auth = await resolveDashboardAuthFromApiKey(key);
    if (!auth) {
      const { body, statusCode } = fail(
        'Invalid API Key',
        'Clé API invalide ou véhicule non trouvé',
        401
      );
      return res.status(statusCode).json(body);
    }
    req.dashboardAuth = auth;
    return next();
  } catch (err) {
    console.error('[requireDashboardAuth]', err);
    const { body, statusCode } = fail(
      'Internal server error',
      err.message,
      500
    );
    return res.status(statusCode).json(body);
  }
}

/**
 * Route réservée au module du véhicule : uniquement la clé « camion », pas la clé siège.
 */
export async function requireVehicleModuleApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    const { body, statusCode } = fail(
      'Missing API Key',
      "La clé API véhicule est requise dans l'en-tête X-API-KEY",
      401
    );
    return res.status(statusCode).json(body);
  }

  const envKey = process.env.SUPERVISOR_API_KEY;
  if (envKey && key === envKey) {
    const { body, statusCode } = fail(
      'Forbidden',
      'Utiliser la clé API du véhicule enregistrée pour ce camion (pas la clé siège)',
      403
    );
    return res.status(statusCode).json(body);
  }

  try {
    const auth = await resolveDashboardAuthFromApiKey(key);
    if (!auth || auth.kind !== 'vehicle') {
      const { body, statusCode } = fail(
        'Invalid API Key',
        'Clé véhicule invalide',
        401
      );
      return res.status(statusCode).json(body);
    }
    req.dashboardAuth = auth;
    return next();
  } catch (err) {
    console.error('[requireVehicleModuleApiKey]', err);
    const { body, statusCode } = fail(
      'Internal server error',
      err.message,
      500
    );
    return res.status(statusCode).json(body);
  }
}

/**
 * Même règles que X-API-KEY (pour SSE : ?api_key= dans l'URL).
 */
export async function getAuthFromApiKey(key) {
  if (!key || typeof key !== 'string') {
    return null;
  }
  try {
    return await resolveDashboardAuthFromApiKey(key);
  } catch (err) {
    console.error('[getAuthFromApiKey]', err);
    return null;
  }
}

/**
 * SSE : ?api_key= ou ?token= (JWT dashboard).
 */
export async function getAuthFromApiKeyOrJwt(query) {
  const rawTok =
    typeof query.token === 'string'
      ? query.token
      : Array.isArray(query.token)
        ? query.token[0]
        : '';
  if (rawTok && String(rawTok).trim()) {
    const payload = verifyDashboardToken(String(rawTok).trim());
    if (payload?.sub && payload.role) {
      const role = payload.role === 'superviseur' ? 'superviseur' : 'admin';
      return {
        kind: 'user',
        userId: String(payload.sub),
        login: String(payload.login || ''),
        role,
      };
    }
    return null;
  }

  const rawKey =
    typeof query.api_key === 'string'
      ? query.api_key
      : Array.isArray(query.api_key)
        ? query.api_key[0]
        : '';
  return getAuthFromApiKey(typeof rawKey === 'string' ? rawKey : '');
}

/** @deprecated utiliser requireDashboardAuth */
export const requireDashboardApiKey = requireDashboardAuth;
