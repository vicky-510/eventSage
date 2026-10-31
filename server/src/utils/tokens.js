import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_ALGORITHM } from './constants.js';

// Pinning the algorithm on verify rejects tokens signed with anything else
// (e.g. alg: none or an asymmetric-key confusion attack).
const VERIFY_OPTIONS = { algorithms: [JWT_ALGORITHM] };

/** Short-lived token sent with each API request. */
export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });
}

/** Long-lived token kept only in an httpOnly cookie, rotated on every use. */
export function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, VERIFY_OPTIONS);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, VERIFY_OPTIONS);
}

/** Refresh tokens are stored hashed, so a DB leak doesn't hand out live sessions. */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
