import request from 'supertest';
import { createApp } from '../src/app.js';
import Guest from '../src/models/Guest.js';
import { setupTestDb, teardownTestDb, clearTestDb } from './setup.js';
import { createUser, createEvent, bearer } from './helpers.js';

let app;
let owner;
let event;

beforeAll(async () => {
  await setupTestDb();
  app = createApp();
});

afterAll(teardownTestDb);

beforeEach(async () => {
  await clearTestDb();
  owner = await createUser();
  event = await createEvent(owner.user._id);
});

const guestsUrl = () => `/events/${event._id}/guests`;

describe('POST /events/:id/guests/link', () => {
  it('creates a not-yet-sent guest with a personal invite token', async () => {
    const res = await request(app)
      .post(`${guestsUrl()}/link`)
      .set(bearer(owner.token))
      .send({ name: 'Priya', phone: '+91 98765 43210' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('not_sent');
    expect(res.body.inviteToken).toMatch(/^[0-9a-f]{24}$/);
  });

  it('rejects a phone number with letters in it', async () => {
    const res = await request(app)
      .post(`${guestsUrl()}/link`)
      .set(bearer(owner.token))
      .send({ name: 'Priya', phone: 'call me maybe' });
    expect(res.status).toBe(400);
  });

  it("can't add guests to someone else's event", async () => {
    const stranger = await createUser('stranger@example.com');
    const res = await request(app).post(`${guestsUrl()}/link`).set(bearer(stranger.token)).send({ name: 'Priya' });
    expect(res.status).toBe(404);
    expect(await Guest.countDocuments()).toBe(0);
  });
});

describe('POST /events/:id/guests/bulk', () => {
  it('adds a list of guests in one request, skipping duplicates and blanks', async () => {
    const res = await request(app)
      .post(`${guestsUrl()}/bulk`)
      .set(bearer(owner.token))
      .send({ guests: [{ name: 'Asha', phone: '123' }, { name: 'Asha' }, { name: '  ' }, 'Ravi'] });

    expect(res.status).toBe(201);
    expect(res.body.map((g) => g.name).sort()).toEqual(['Asha', 'Ravi']);
  });

  it('rejects an overly long name instead of storing it', async () => {
    const res = await request(app)
      .post(`${guestsUrl()}/bulk`)
      .set(bearer(owner.token))
      .send({ guests: [{ name: 'x'.repeat(500) }] });
    expect(res.status).toBe(400);
  });

  it('rejects an empty list', async () => {
    const res = await request(app).post(`${guestsUrl()}/bulk`).set(bearer(owner.token)).send({ guests: [] });
    expect(res.status).toBe(400);
  });
});

describe('GET /events/:id/guests', () => {
  it("lists only this event's guests", async () => {
    const otherEvent = await createEvent(owner.user._id, { title: 'Other' });
    await Guest.create([
      { eventId: event._id, name: 'Asha' },
      { eventId: otherEvent._id, name: 'Not mine' },
    ]);

    const res = await request(app).get(guestsUrl()).set(bearer(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.map((g) => g.name)).toEqual(['Asha']);
  });
});

describe('POST /events/:id/guests/:guestId/mark-sent', () => {
  it('moves a guest to invited exactly once', async () => {
    const guest = await Guest.create({ eventId: event._id, name: 'Asha', status: 'not_sent' });
    const url = `${guestsUrl()}/${guest._id}/mark-sent`;

    const first = await request(app).post(url).set(bearer(owner.token));
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('invited');

    const second = await request(app).post(url).set(bearer(owner.token));
    expect(second.body.status).toBe('invited');
    expect(second.body.sentAt).toBe(first.body.sentAt);
  });

  it('does not downgrade a guest who already responded', async () => {
    const guest = await Guest.create({ eventId: event._id, name: 'Asha', status: 'accepted' });
    const res = await request(app).post(`${guestsUrl()}/${guest._id}/mark-sent`).set(bearer(owner.token));
    expect(res.body.status).toBe('accepted');
  });

  it('returns 400 for a malformed guest id', async () => {
    const res = await request(app).post(`${guestsUrl()}/nope/mark-sent`).set(bearer(owner.token));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /events/:id/guests/:guestId', () => {
  it('removes the guest', async () => {
    const guest = await Guest.create({ eventId: event._id, name: 'Asha' });
    const res = await request(app).delete(`${guestsUrl()}/${guest._id}`).set(bearer(owner.token));
    expect(res.status).toBe(200);
    expect(await Guest.countDocuments()).toBe(0);
  });

  it("can't delete a guest that belongs to a different event", async () => {
    const otherEvent = await createEvent(owner.user._id, { title: 'Other' });
    const guest = await Guest.create({ eventId: otherEvent._id, name: 'Asha' });
    const res = await request(app).delete(`${guestsUrl()}/${guest._id}`).set(bearer(owner.token));
    expect(res.status).toBe(404);
    expect(await Guest.countDocuments()).toBe(1);
  });
});
