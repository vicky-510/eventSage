import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_MAX, AI_RATE_LIMIT_MAX } from '../utils/constants.js';

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

// AI calls are the most expensive thing this API does, so they get their own,
// tighter limit on top of whatever's in front of the whole app.
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please slow down and try again shortly' },
});
