import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import Event from '../src/models/Event.js';
import Guest from '../src/models/Guest.js';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup.js';
import { createUser, createEvent, bearer } from './helpers.js';

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
    const { token } = await createUser();

    const create = await request(app)
      .post('/events')
      .set(bearer(token))
      .send({ title: 'Birthday Bash', occasionType: 'birthday', budgetTotal: 50000 });

    expect(create.status).toBe(201);
    expect(create.body.title).toBe('Birthday Bash');
    expect(create.body.publicId).toBeDefined();

    const list = await request(app).get('/events').set(bearer(token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });
});

describe('POST /events validation', () => {
  it('requires a title', async () => {
    const { token } = await createUser();
    const res = await request(app).post('/events').set(bearer(token)).send({ budgetTotal: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Title is required/);
  });

  it('rejects a negative budget', async () => {
    const { token } = await createUser();
    const res = await request(app).post('/events').set(bearer(token)).send({ title: 'Party', budgetTotal: -5 });
    expect(res.status).toBe(400);
  });

  it('ignores fields the client is not allowed to set, like ownerId', async () => {
    const { user, token } = await createUser();
    const other = new mongoose.Types.ObjectId();
    const res = await request(app).post('/events').set(bearer(token)).send({ title: 'Party', ownerId: other });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(user._id.toString());
  });
});

describe('GET /events', () => {
  it('returns newest first, paginates, and omits the chat transcript', async () => {
    const { user, token } = await createUser();
    for (const title of ['First', 'Second', 'Third']) {
      await createEvent(user._id, { title, assistantChat: [{ role: 'user', content: 'hi' }] });
    }

    const page = await request(app).get('/events?limit=2').set(bearer(token));
    expect(page.status).toBe(200);
    expect(page.body.map((e) => e.title)).toEqual(['Third', 'Second']);
    expect(page.body[0].assistantChat).toBeUndefined();

    const next = await request(app).get('/events?limit=2&skip=2').set(bearer(token));
    expect(next.body.map((e) => e.title)).toEqual(['First']);
  });

  it('rejects an out-of-range page size', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/events?limit=1000').set(bearer(token));
    expect(res.status).toBe(400);
  });

  it("never returns another user's events", async () => {
    const owner = await createUser('owner@example.com');
    const stranger = await createUser('stranger@example.com');
    await createEvent(owner.user._id);

    const res = await request(app).get('/events').set(bearer(stranger.token));
    expect(res.body).toHaveLength(0);
  });
});

describe('GET/PATCH/DELETE /events/:id', () => {
  it('returns 400 for a malformed id instead of a server error', async () => {
    const { token } = await createUser();
    const res = await request(app).get('/events/not-an-id').set(bearer(token));
    expect(res.status).toBe(400);
  });

  it("returns 404 for someone else's event", async () => {
    const owner = await createUser('owner@example.com');
    const stranger = await createUser('stranger@example.com');
    const event = await createEvent(owner.user._id);

    for (const method of ['get', 'patch', 'delete']) {
      const res = await request(app)[method](`/events/${event._id}`).set(bearer(stranger.token)).send({});
      expect(res.status).toBe(404);
    }
  });

  it('updates editable fields and validates them', async () => {
    const { user, token } = await createUser();
    const event = await createEvent(user._id);

    const ok = await request(app).patch(`/events/${event._id}`).set(bearer(token)).send({ guestCount: 120 });
    expect(ok.status).toBe(200);
    expect(ok.body.guestCount).toBe(120);

    const bad = await request(app).patch(`/events/${event._id}`).set(bearer(token)).send({ guestCount: -3 });
    expect(bad.status).toBe(400);
  });

  it('merges a plan patch, keeps tracked spending, and sanitizes untrusted items', async () => {
    const { user, token } = await createUser();
    const event = await createEvent(user._id, {
      plan: { ideas: ['Fairy lights'], checklist: [{ task: 'Book venue', status: 'todo' }] },
    });

    const res = await request(app)
      .patch(`/events/${event._id}`)
      .set(bearer(token))
      .send({
        plan: {
          budget: [{ category: 'Venue', amount: 20000, spent: 5000 }, { category: '', amount: 'lots' }],
          checklist: [{ task: 'Book venue', status: 'hacked' }],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.plan.budget).toEqual([{ category: 'Venue', amount: 20000, spent: 5000 }]);
    expect(res.body.plan.checklist[0].status).toBe('todo');
    expect(res.body.plan.ideas).toEqual(['Fairy lights']);
  });

  it('deletes the event together with its guests', async () => {
    const { user, token } = await createUser();
    const event = await createEvent(user._id);
    await Guest.create({ eventId: event._id, name: 'Asha' });

    const res = await request(app).delete(`/events/${event._id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(await Event.countDocuments()).toBe(0);
    expect(await Guest.countDocuments()).toBe(0);
  });
});
