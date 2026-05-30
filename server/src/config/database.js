import mysql from 'mysql2/promise';

let pool = null;

function normalizeMysqlUrl(raw) {
  if (!raw?.trim()) return '';
  try {
    const u = new URL(raw);
    u.searchParams.delete('serverVersion');
    u.searchParams.delete('charset');
    const out = u.toString();
    return out.endsWith('?') ? out.slice(0, -1) : out;
  } catch {
    return raw.split('?')[0];
  }
}

/**
 * Pool MySQL (lazy). DATABASE_URL : même variable que Symfony (mysql://...).
 */
export function getPool() {
  const url = normalizeMysqlUrl(process.env.DATABASE_URL);
  if (!url) {
    return null;
  }
  if (!pool) {
    pool = mysql.createPool({ uri: url });
  }
  return pool;
}
