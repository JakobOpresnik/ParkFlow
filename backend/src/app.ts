import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import bookingsRouter from './routes/bookings.js';
import changesRouter from './routes/changes.js';
import feedbackRouter from './routes/feedback.js';
import integrationsRouter from './routes/integrations.js';
import internalRouter from './routes/internal.js';
import lotsRouter from './routes/lots.js';
import notificationsRouter from './routes/notifications.js';
import ownersRouter from './routes/owners.js';
import presenceRouter from './routes/presence.js';
import spotsRouter from './routes/spots.js';
import statsRouter from './routes/stats.js';
import subscribeRouter from './routes/subscribe.js';

export function createApp() {
  const app = express();

  // Allowed browser origins: local dev (any localhost port) and the Abelium
  // timesheet app, which calls the token-gated GET /api/owners/timesheet-ids
  // endpoint (and so must also be allowed to send the X-Owners-Token header).
  app.use(
    cors({
      origin: [
        /^https?:\/\/localhost(:\d+)?$/,
        'https://timesheet.abelium.com',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Owners-Token'],
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
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/internal', internalRouter);

  app.use(errorHandler);

  return app;
}
