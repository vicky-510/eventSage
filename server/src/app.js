import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import publicRoutes from './routes/public.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { HttpError } from './utils/httpError.js';
import { JSON_BODY_LIMIT } from './utils/constants.js';

function parseAllowedOrigins() {
  return (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Builds the Express app (no DB connection or listen, so tests can reuse it). */
export function createApp() {
  const app = express();
  const allowedOrigins = parseAllowedOrigins();

  // Behind Vercel's proxy: trust the first hop so rate limiting keys on the
  // real client IP instead of the proxy's.
  app.set('trust proxy', 1);

  // A JSON-only API: nothing here should ever be framed or run scripts.
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser requests (no Origin header) and any listed origin.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new HttpError(403, 'Origin not allowed'));
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(globalLimiter);
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
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
