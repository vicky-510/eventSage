import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import User from '../models/User.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/tokens.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { BCRYPT_ROUNDS, REFRESH_TOKEN_MAX_AGE_MS } from '../utils/constants.js';

const router = Router();

const REFRESH_COOKIE_NAME = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  // Frontend (Netlify) and backend (Vercel) are different sites in production,
  // so the cookie must be SameSite=None (requires Secure) to survive a
  // cross-site fetch. Locally, frontend and backend share no cookie domain
  // either, but 'lax' is enough since dev traffic is same-site over HTTP.
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  path: '/auth',
};

router.post(
  '/signup',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 10 })
      .withMessage('Password must be at least 10 characters')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number')
      .matches(/[A-Za-z]/)
      .withMessage('Password must contain a letter'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await User.create({ email, passwordHash });

      const accessToken = signAccessToken(user._id.toString());
      const refreshToken = signRefreshToken(user._id.toString());
      user.refreshTokenHash = hashToken(refreshToken);
      await user.save();

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
      res.status(201).json({ accessToken, user: { id: user._id, email: user.email } });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      const genericError = () => res.status(401).json({ error: 'Invalid email or password' });

      if (!user) return genericError();
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return genericError();

      const accessToken = signAccessToken(user._id.toString());
      const refreshToken = signRefreshToken(user._id.toString());
      user.refreshTokenHash = hashToken(refreshToken);
      await user.save();

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
      res.json({ accessToken, user: { id: user._id, email: user.email } });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.sub);
    if (!user || user.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ error: 'Refresh token revoked' });
    }

    const accessToken = signAccessToken(user._id.toString());
    const newRefreshToken = signRefreshToken(user._id.toString());
    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await User.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
      } catch {
        // token already invalid, nothing to revoke
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth', secure: isProd, sameSite: isProd ? 'none' : 'lax' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
