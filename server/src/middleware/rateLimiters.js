import rateLimit from 'express-rate-limit';
import {
  RATE_LIMIT_WINDOW_MS,
  GLOBAL_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX,
  AI_RATE_LIMIT_MAX,
  PUBLIC_WRITE_RATE_LIMIT_MAX,
} from '../utils/constants.js';

function createLimiter(max, error) {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error },
  });
}

/** Site-wide ceiling applied to every request. */
export const globalLimiter = createLimiter(GLOBAL_RATE_LIMIT_MAX, 'Too many requests, please try again later');

/** Signup/login: tight, to blunt credential stuffing and brute force. */
export const authLimiter = createLimiter(AUTH_RATE_LIMIT_MAX, 'Too many attempts, please try again later');

/** AI calls are the most expensive thing this API does, so they get their own budget. */
export const aiLimiter = createLimiter(AI_RATE_LIMIT_MAX, 'Too many AI requests, please slow down and try again shortly');

/** Unauthenticated writes (guest RSVPs) — stops anyone with a link from flooding an event. */
export const publicWriteLimiter = createLimiter(
  PUBLIC_WRITE_RATE_LIMIT_MAX,
  'Too many RSVP submissions, please try again later'
);
