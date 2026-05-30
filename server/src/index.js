import 'dotenv/config';
import { createApp } from './app.js';
import { startFirestoreOutboxProcessor } from './data/firestoreOutbox.js';

const port = Number(process.env.PORT) || 3001;
const app = createApp();

app.listen(port, () => {
  console.log(`SFAM API (Express) listening on http://127.0.0.1:${port}`);
  console.log(
    `  → POST /api/fatigue-events (ingest complet) | GET /api/ingest-info pour vérifier la version`
  );
  startFirestoreOutboxProcessor();
});
