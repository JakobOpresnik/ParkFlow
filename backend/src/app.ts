import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import bookingsRouter from './routes/bookings.js';
import changesRouter from './routes/changes.js';
import lotsRouter from './routes/lots.js';
import ownersRouter from './routes/owners.js';
import presenceRouter from './routes/presence.js';
import spotsRouter from './routes/spots.js';
import subscribeRouter from './routes/subscribe.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: /^https?:\/\/localhost(:\d+)?$/,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/spots', spotsRouter);
  app.use('/api/owners', ownersRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/lots', lotsRouter);
  app.use('/api/changes', changesRouter);
  app.use('/api/presence', presenceRouter);
  app.use('/api/subscribe', subscribeRouter);

  app.use(errorHandler);

  return app;
}
