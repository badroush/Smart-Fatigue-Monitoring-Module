import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import ingestRouter from './routes/ingest.js';
import apiRouter from './routes/api.js';
import { getDataProvider } from './data/provider.js';
import { readFromFirestore } from './data/readFallback.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || true,
      credentials: false,
      exposedHeaders: ['X-SFAM-Data-Provider', 'X-SFAM-Read-Source'],
    })
  );
  app.use(express.json({ limit: '2mb' }));

  /** Permet de vérifier dans les DevTools (Network) d’où l’API lit les données : mysql | firestore | dual */
  app.use('/api', (req, res, next) => {
    res.setHeader('X-SFAM-Data-Provider', getDataProvider());
    res.setHeader(
      'X-SFAM-Read-Source',
      readFromFirestore() ? 'firestore' : 'mysql'
    );
    next();
  });

  app.use('/api', healthRouter);
  app.use('/api', ingestRouter);
  app.use('/api', apiRouter);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Aucune route pour ${req.method} ${req.path}`,
    });
  });

  return app;
}
