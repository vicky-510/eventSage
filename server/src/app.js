import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import publicRoutes from './routes/public.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser requests (no Origin header) and any listed origin.
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/auth', authRoutes);
  app.use('/events', eventRoutes);
  app.use('/public', publicRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
