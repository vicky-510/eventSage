import request from 'supertest';
import { createApp } from '../src/app.js';
import User from '../src/models/User.js';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup.js';
import { createUser } from './helpers.js';

let app;

beforeAll(async () => {
  await setupTestDb();
  app = createApp();
});

afterAll(teardownTestDb);
afterEach(clearTestDb);

const refreshCookie = (token) => `refreshToken=${token}`;

function extractRefreshToken(res) {
  const cookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));
  return cookie?.split(';')[0].split('=')[1];
}

describe('POST /auth/refresh', () => {
  it('issues a new access token and rotates the refresh token', async () => {
    const { refreshToken } = await createUser();

    const res = await request(app).post('/auth/refresh').set('Cookie', refreshCookie(refreshToken));

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    const rotated = extractRefreshToken(res);
    expect(rotated).toBeDefined();
    expect(rotated).not.toBe(refreshToken);
  });

  it('sets the refresh cookie as httpOnly and scoped to /auth', async () => {
    const { refreshToken } = await createUser();
    const res = await request(app).post('/auth/refresh').set('Cookie', refreshCookie(refreshToken));
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Path=\/auth/);
  });

  it('rejects a refresh token that has already been used (replay)', async () => {
    const { refreshToken } = await createUser();
    await request(app).post('/auth/refresh').set('Cookie', refreshCookie(refreshToken));

    const replay = await request(app).post('/auth/refresh').set('Cookie', refreshCookie(refreshToken));
    expect(replay.status).toBe(401);
  });

  it('rejects a missing or forged refresh token', async () => {
    expect((await request(app).post('/auth/refresh')).status).toBe(401);
    expect((await request(app).post('/auth/refresh').set('Cookie', refreshCookie('forged'))).status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the session so the refresh token stops working', async () => {
    const { user, refreshToken } = await createUser();

    const res = await request(app).post('/auth/logout').set('Cookie', refreshCookie(refreshToken));
    expect(res.status).toBe(200);

    const stored = await User.findById(user._id).select('+refreshTokenHash').lean();
    expect(stored.refreshTokenHash).toBeNull();
    expect((await request(app).post('/auth/refresh').set('Cookie', refreshCookie(refreshToken))).status).toBe(401);
  });

  it('succeeds even without a session', async () => {
    expect((await request(app).post('/auth/logout')).status).toBe(200);
  });
});

describe('User secrets', () => {
  it('are excluded from queries by default', async () => {
    const { user } = await createUser();
    const fetched = await User.findById(user._id).lean();
    expect(fetched.passwordHash).toBeUndefined();
    expect(fetched.refreshTokenHash).toBeUndefined();
  });
});
