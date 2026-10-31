import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup.js';

let app;

beforeAll(async () => {
  await setupTestDb();
  app = createApp();
});

afterAll(teardownTestDb);
afterEach(clearTestDb);

describe('POST /auth/signup', () => {
  it('creates a new account with a valid email/password', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'user@example.com', password: 'SuperSecret1' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('user@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/auth/signup').send({ email: 'dup@example.com', password: 'SuperSecret1' });
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'dup@example.com', password: 'AnotherPass1' });

    expect(res.status).toBe(409);
  });

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'weak@example.com', password: 'short1' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/signup').send({ email: 'login@example.com', password: 'SuperSecret1' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'SuperSecret1' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects an incorrect password with a generic error', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same generic error', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'WhateverPass1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});
