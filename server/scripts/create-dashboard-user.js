/**
 * Crée un utilisateur dashboard dans Firestore (collection dashboard_users).
 * Usage : node scripts/create-dashboard-user.js <login> <motDePasse> <admin|superviseur>
 *
 * Prérequis : variables Firebase (FIREBASE_SERVICE_ACCOUNT_PATH ou JSON) comme pour le serveur.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { upsertDashboardUser } from '../src/data/firestore/dashboardUsers.js';

const [, , login, password, roleIn] = process.argv;

if (!login || !password) {
  console.error(
    'Usage: node scripts/create-dashboard-user.js <login> <password> <admin|superviseur>'
  );
  process.exit(1);
}

const role = roleIn === 'superviseur' ? 'superviseur' : 'admin';

async function main() {
  const hash = await bcrypt.hash(password, 12);
  const id = await upsertDashboardUser(login, hash, role);
  console.log(`Utilisateur ${role} créé / mis à jour : ${id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
