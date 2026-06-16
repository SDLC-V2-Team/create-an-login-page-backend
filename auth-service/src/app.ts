import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/authRoutes';

export function createApp(): Application {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRoutes);

  // Centralised error handler.
  app.use((err: Error, _req: Request, res: Response, _next: Function) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
