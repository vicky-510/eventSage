import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import { HttpError } from '../src/utils/httpError.js';
import { assertRequiredEnv } from '../src/utils/env.js';
import { AUTH_RATE_LIMIT_MAX } from '../src/utils/constants.js';
import { setupTestDb, teardownTestDb } from './setup.js';

let app;

beforeAll(async () => {
  process.env.CLIENT_ORIGIN = 'https://eventsage.netlify.app';
  await setupTestDb();
  app = createApp();
});

afterAll(teardownTestDb);

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('HTTP hardening', () => {
  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'none'/);
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured frontend origin and blocks others', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'https://eventsage.netlify.app');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://eventsage.netlify.app');

    const blocked = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(403);
  });

  it('answers malformed JSON with 400 and oversized bodies with 413', async () => {
    const malformed = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(malformed.status).toBe(400);

    const huge = await request(app).post('/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(200_000) });
    expect(huge.status).toBe(413);
  });

  it('strips Mongo operators from request bodies (NoSQL injection)', async () => {
    const res = await request(app).post('/auth/login').send({ email: { $gt: '' }, password: 'whatever' });
    expect(res.status).toBe(400);
  });

  it('rejects an access token signed with a different algorithm', async () => {
    const forged = jwt.sign({ sub: new mongoose.Types.ObjectId().toString() }, 'test-access-secret', { algorithm: 'HS512' });
    const res = await request(app).get('/events').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('returns JSON 404s for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

describe('Auth rate limiting', () => {
  it(`blocks login after ${AUTH_RATE_LIMIT_MAX} attempts`, async () => {
    const attempt = () => request(app).post('/auth/login').send({ email: 'brute@example.com', password: 'Guess12345' });
    for (let i = 0; i < AUTH_RATE_LIMIT_MAX; i += 1) await attempt();
    expect((await attempt()).status).toBe(429);
  });
});

describe('errorHandler', () => {
  it('never leaks internal error details', () => {
    const res = mockRes();
    errorHandler(new Error('connection string mongodb://user:pass@host'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
  });

  it('passes through client-safe HttpError messages', () => {
    const res = mockRes();
    errorHandler(new HttpError(404, 'Event not found'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Event not found' });
  });

  it('turns Mongoose cast errors into a 400', () => {
    const res = mockRes();
    errorHandler(Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError' }), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('asyncHandler', () => {
  it('forwards a rejected promise to next()', async () => {
    const next = jest.fn();
    const boom = new Error('boom');
    await asyncHandler(async () => {
      throw boom;
    })({}, {}, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe('assertRequiredEnv', () => {
  it('names every missing variable', () => {
    const saved = { ...process.env };
    delete process.env.MONGO_URI;
    delete process.env.GEMINI_API_KEY;
    expect(() => assertRequiredEnv()).toThrow(/MONGO_URI.*GEMINI_API_KEY/);
    process.env = saved;
  });
});
