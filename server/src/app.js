import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import publicRoutes from './routes/public.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/auth', authRoutes);
  app.use('/events', eventRoutes);
  app.use('/public', publicRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
