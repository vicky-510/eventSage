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

describe('Protected /events routes', () => {
  it('rejects requests with no access token', async () => {
    const res = await request(app).get('/events');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a garbage token', async () => {
    const res = await request(app).get('/events').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('allows access and creates an event with a valid token', async () => {
    const signup = await request(app)
      .post('/auth/signup')
      .send({ email: 'owner@example.com', password: 'SuperSecret1' });
    const token = signup.body.accessToken;

    const create = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Birthday Bash', occasionType: 'birthday', budgetTotal: 50000 });

    expect(create.status).toBe(201);
    expect(create.body.title).toBe('Birthday Bash');
    expect(create.body.publicId).toBeDefined();

    const list = await request(app).get('/events').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });
});
