import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import User from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/tokens.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import {
  BCRYPT_ROUNDS,
  REFRESH_TOKEN_MAX_AGE_MS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '../utils/constants.js';

const router = Router();

const REFRESH_COOKIE_NAME = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';
const REFRESH_COOKIE_BASE = {
  httpOnly: true,
  // Frontend (Netlify) and backend (Vercel) are different sites in production,
  // so the cookie must be SameSite=None (requires Secure) to survive a
  // cross-site fetch. Locally 'lax' is enough since dev traffic is same-site.
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/auth',
};

const emailRule = body('email').isEmail().withMessage('Valid email required').normalizeEmail();

/**
 * Issues a fresh access token + rotated refresh token for `userId`, storing
 * only the refresh token's hash server-side so it can be revoked.
 */
async function issueSession(res, userId) {
  const id = userId.toString();
  const accessToken = signAccessToken(id);
  const refreshToken = signRefreshToken(id);
  await User.updateOne({ _id: id }, { refreshTokenHash: hashToken(refreshToken) });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...REFRESH_COOKIE_BASE, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
  return accessToken;
}

router.post(
  '/signup',
  authLimiter,
  [
    emailRule,
    body('password')
      .isString()
      .isLength({ min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })
      .withMessage(`Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`)
      .matches(/[0-9]/)
      .withMessage('Password must contain a number')
      .matches(/[A-Za-z]/)
      .withMessage('Password must contain a letter'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (await User.exists({ email })) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, passwordHash });

    const accessToken = await issueSession(res, user._id);
    res.status(201).json({ accessToken, user: { id: user._id, email: user.email } });
  })
);

router.post(
  '/login',
  authLimiter,
  [emailRule, body('password').isString().isLength({ min: 1, max: MAX_PASSWORD_LENGTH })],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');
    // Same message for unknown email and wrong password, so the response
    // doesn't reveal which emails are registered.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Invalid email or password');
    }

    const accessToken = await issueSession(res, user._id);
    res.json({ accessToken, user: { id: user._id, email: user.email } });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw new HttpError(401, 'No refresh token');

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new HttpError(401, 'Invalid or expired refresh token');
    }

    // Atomic compare-and-swap: only the current refresh token can be exchanged,
    // and only once — a replayed or concurrently reused token gets nothing.
    const accessToken = signAccessToken(payload.sub);
    const newRefreshToken = signRefreshToken(payload.sub);
    const rotated = await User.findOneAndUpdate(
      { _id: payload.sub, refreshTokenHash: hashToken(token) },
      { refreshTokenHash: hashToken(newRefreshToken) }
    );
    if (!rotated) throw new HttpError(401, 'Refresh token revoked');

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, { ...REFRESH_COOKIE_BASE, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
    res.json({ accessToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    let payload = null;
    try {
      payload = token ? verifyRefreshToken(token) : null;
    } catch {
      // Already invalid or expired: there's no live session left to revoke.
    }
    if (payload) await User.updateOne({ _id: payload.sub }, { refreshTokenHash: null });
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_BASE);
    res.json({ ok: true });
  })
);

export default router;
