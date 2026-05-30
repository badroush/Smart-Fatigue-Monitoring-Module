import bcrypt from 'bcrypt';
import { signDashboardToken } from './authTokens.js';
import { findDashboardUserByLogin } from '../data/firestore/dashboardUsers.js';

/**
 * @returns {Promise<{ token: string, role: string, login: string } | null>}
 */
export async function loginDashboardUser(login, password) {
  const l = String(login || '').trim().toLowerCase();
  const p = String(password || '');
  if (!l || !p) return null;

  if (process.env.ALLOW_ENV_DASHBOARD_LOGIN === '1') {
    const adminLogin = process.env.SFAM_ADMIN_LOGIN?.trim().toLowerCase();
    const adminPass = process.env.SFAM_ADMIN_PASSWORD ?? '';
    if (adminLogin && l === adminLogin && p === adminPass) {
      return {
        token: signDashboardToken({
          sub: 'env-admin',
          login: l,
          role: 'admin',
        }),
        role: 'admin',
        login: l,
      };
    }
    const supLogin = process.env.SFAM_SUPERVISEUR_LOGIN?.trim().toLowerCase();
    const supPass = process.env.SFAM_SUPERVISEUR_PASSWORD ?? '';
    if (supLogin && l === supLogin && p === supPass) {
      return {
        token: signDashboardToken({
          sub: 'env-sup',
          login: l,
          role: 'superviseur',
        }),
        role: 'superviseur',
        login: l,
      };
    }
  }

  const user = await findDashboardUserByLogin(l);
  if (!user?.passwordHash) return null;
  const ok = await bcrypt.compare(p, user.passwordHash);
  if (!ok) return null;

  return {
    token: signDashboardToken({
      sub: user.id,
      login: user.login,
      role: user.role,
    }),
    role: user.role,
    login: user.login,
  };
}
