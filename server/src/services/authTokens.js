import jwt from 'jsonwebtoken';

function secret() {
  return process.env.JWT_SECRET || 'dev-change-JWT_SECRET';
}

/**
 * @param {{ sub: string, login: string, role: 'admin' | 'superviseur' }} payload
 */
export function signDashboardToken(payload, expiresIn = '12h') {
  return jwt.sign(payload, secret(), {
    expiresIn,
    issuer: 'sfam-dashboard',
  });
}

/** @returns {{ sub: string, login: string, role: string, iat: number, exp: number } | null} */
export function verifyDashboardToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    return jwt.verify(token, secret(), { issuer: 'sfam-dashboard' });
  } catch {
    return null;
  }
}
