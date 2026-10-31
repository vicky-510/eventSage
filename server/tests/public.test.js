import request from 'supertest';
import { createApp } from '../src/app.js';
import Guest from '../src/models/Guest.js';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup.js';
import { createUser, createEvent } from './helpers.js';
import { PUBLIC_WRITE_RATE_LIMIT_MAX } from '../src/utils/constants.js';

let app;
let event;

beforeAll(async () => {
  await setupTestDb();
  app = createApp();
});

afterAll(teardownTestDb);

beforeEach(async () => {
  await clearTestDb();
  const { user } = await createUser();
  event = await createEvent(user._id, {
    location: 'Chennai',
    plan: { budget: [{ category: 'Venue', amount: 20000 }] },
  });
});

describe('GET /public/events/:publicId', () => {
  it('exposes only guest-safe fields, never the budget, plan or owner', async () => {
    const res = await request(app).get(`/public/events/${event.publicId}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Birthday Bash');
    expect(res.body.location).toBe('Chennai');
    for (const secret of ['_id', 'ownerId', 'budgetTotal', 'plan', 'assistantChat']) {
      expect(res.body[secret]).toBeUndefined();
    }
    expect(res.headers['cache-control']).toMatch(/public, max-age=60/);
  });

  it('includes the invite for a personal link and marks it uncacheable', async () => {
    const guest = await Guest.create({ eventId: event._id, name: 'Asha', inviteToken: 'a'.repeat(24) });
    const res = await request(app).get(`/public/events/${event.publicId}?g=${guest.inviteToken}`);

    expect(res.body.invite).toEqual(expect.objectContaining({ name: 'Asha', status: 'not_sent' }));
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('returns 400 for a malformed link and 404 for an unknown one', async () => {
    expect((await request(app).get('/public/events/<script>')).status).toBe(400);
    expect((await request(app).get(`/public/events/${'0'.repeat(16)}`)).status).toBe(404);
  });
});

describe('POST /public/events/:publicId/rsvp', () => {
  it("updates the invited guest's record when RSVPing from a personal link", async () => {
    const guest = await Guest.create({ eventId: event._id, name: 'Asha', inviteToken: 'b'.repeat(24) });

    const res = await request(app)
      .post(`/public/events/${event.publicId}/rsvp`)
      .send({ name: 'Asha K', attending: true, dietaryNotes: 'Vegetarian', inviteToken: guest.inviteToken });

    expect(res.status).toBe(201);
    expect(await Guest.countDocuments()).toBe(1);
    const updated = await Guest.findById(guest._id).lean();
    expect(updated).toEqual(expect.objectContaining({ name: 'Asha K', status: 'accepted', dietaryNotes: 'Vegetarian' }));
  });

  it('adds a new guest when RSVPing from the open event link', async () => {
    const res = await request(app)
      .post(`/public/events/${event.publicId}/rsvp`)
      .send({ name: 'Walk-in', attending: false });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('declined');
    expect(await Guest.countDocuments()).toBe(1);
  });

  it('rejects a non-boolean attending value', async () => {
    const res = await request(app)
      .post(`/public/events/${event.publicId}/rsvp`)
      .send({ name: 'Asha', attending: 'maybe' });
    expect(res.status).toBe(400);
  });

  it('rate-limits repeated submissions from one client', async () => {
    const url = `/public/events/${event.publicId}/rsvp`;
    for (let i = 0; i < PUBLIC_WRITE_RATE_LIMIT_MAX; i += 1) {
      await request(app).post(url).send({ name: `Guest ${i}`, attending: true });
    }
    const blocked = await request(app).post(url).send({ name: 'One too many', attending: true });
    expect(blocked.status).toBe(429);
  });
});
