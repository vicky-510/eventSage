import { jest } from '@jest/globals';
import request from 'supertest';

const generateStructuredPlan = jest.fn();
const generateText = jest.fn();

jest.unstable_mockModule('../src/utils/gemini.js', () => ({
  generateStructuredPlan,
  generateText,
  getModelChain: () => ['mock-model'],
  extractJson: JSON.parse,
}));

const { createApp } = await import('../src/app.js');
const { setupTestDb, teardownTestDb, clearTestDb } = await import('./setup.js');
const { createUser, createEvent, bearer } = await import('./helpers.js');
const { MAX_CHAT_HISTORY } = await import('../src/utils/constants.js');

let app;
let owner;
let event;

function aiUnavailable() {
  const err = new Error('all models failed');
  err.status = 502;
  err.publicMessage = 'AI is unavailable right now, please try again shortly';
  return err;
}

beforeAll(async () => {
  await setupTestDb();
  app = createApp();
});

afterAll(teardownTestDb);

beforeEach(async () => {
  await clearTestDb();
  generateStructuredPlan.mockReset();
  generateText.mockReset();
  owner = await createUser();
  event = await createEvent(owner.user._id);
});

describe('POST /events/:id/generate-plan', () => {
  it('stores a sanitized plan and reports which model answered', async () => {
    generateStructuredPlan.mockResolvedValue({
      modelUsed: 'mock-model',
      data: {
        budget: [{ category: 'Venue', amount: 20000 }, { category: 'Broken' }],
        timeline: [{ label: 'Guests arrive', time: '6 PM' }],
        checklist: [{ task: 'Book venue', status: 'todo' }],
        ideas: ['Fairy lights', 42],
      },
    });

    const res = await request(app).post(`/events/${event._id}/generate-plan`).set(bearer(owner.token));

    expect(res.status).toBe(200);
    expect(res.body.modelUsed).toBe('mock-model');
    expect(res.body.event.plan.budget).toEqual([{ category: 'Venue', amount: 20000, spent: 0 }]);
    expect(res.body.event.plan.ideas).toEqual(['Fairy lights']);
    expect(generateStructuredPlan.mock.calls[0][0]).toContain('Birthday Bash');
  });

  it('returns a safe 502 when every model fails, without touching the plan', async () => {
    generateStructuredPlan.mockRejectedValue(aiUnavailable());

    const res = await request(app).post(`/events/${event._id}/generate-plan`).set(bearer(owner.token));

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('AI is unavailable right now, please try again shortly');
  });

  it("won't generate a plan for someone else's event", async () => {
    const stranger = await createUser('stranger@example.com');
    const res = await request(app).post(`/events/${event._id}/generate-plan`).set(bearer(stranger.token));
    expect(res.status).toBe(404);
    expect(generateStructuredPlan).not.toHaveBeenCalled();
  });
});

describe('POST /events/:id/replan', () => {
  it('requires a description of what changed', async () => {
    const res = await request(app).post(`/events/${event._id}/replan`).set(bearer(owner.token)).send({});
    expect(res.status).toBe(400);
    expect(generateStructuredPlan).not.toHaveBeenCalled();
  });

  it('passes the change to the model and saves the reallocated plan', async () => {
    generateStructuredPlan.mockResolvedValue({
      modelUsed: 'mock-model',
      data: { budget: [{ category: 'Catering', amount: 30000 }] },
    });

    const res = await request(app)
      .post(`/events/${event._id}/replan`)
      .set(bearer(owner.token))
      .send({ changeDescription: 'Lost 10000 on the venue deposit' });

    expect(res.status).toBe(200);
    expect(res.body.event.plan.budget[0].category).toBe('Catering');
    expect(generateStructuredPlan.mock.calls[0][0]).toContain('Lost 10000 on the venue deposit');
  });
});

describe('POST /events/:id/chat', () => {
  it('replies and persists both sides of the conversation', async () => {
    generateText.mockResolvedValue({ modelUsed: 'mock-model', data: 'Book the caterer first.' });

    const res = await request(app)
      .post(`/events/${event._id}/chat`)
      .set(bearer(owner.token))
      .send({ message: 'What should I book first?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Book the caterer first.');

    const detail = await request(app).get(`/events/${event._id}`).set(bearer(owner.token));
    expect(detail.body.assistantChat.map((m) => m.role)).toEqual(['user', 'assistant']);
  });

  it(`keeps only the last ${MAX_CHAT_HISTORY} messages`, async () => {
    generateText.mockResolvedValue({ modelUsed: 'mock-model', data: 'ok' });
    for (let i = 0; i < MAX_CHAT_HISTORY; i += 1) {
      await request(app).post(`/events/${event._id}/chat`).set(bearer(owner.token)).send({ message: `q${i}` });
    }

    const detail = await request(app).get(`/events/${event._id}`).set(bearer(owner.token));
    expect(detail.body.assistantChat).toHaveLength(MAX_CHAT_HISTORY);
  });

  it('rejects an empty message', async () => {
    const res = await request(app).post(`/events/${event._id}/chat`).set(bearer(owner.token)).send({ message: '  ' });
    expect(res.status).toBe(400);
  });
});

describe('POST /events/intake-chat', () => {
  it('asks a follow-up question while the brief is incomplete', async () => {
    generateStructuredPlan.mockResolvedValue({ modelUsed: 'mock-model', data: { done: false, reply: 'How many guests?' } });

    const res = await request(app)
      .post('/events/intake-chat')
      .set(bearer(owner.token))
      .send({ messages: [{ role: 'user', content: 'Planning a birthday' }] });

    expect(res.body).toEqual({ done: false, reply: 'How many guests?', modelUsed: 'mock-model' });
  });

  it('returns a sanitized brief once the model has enough information', async () => {
    generateStructuredPlan.mockResolvedValue({
      modelUsed: 'mock-model',
      data: { done: true, reply: 'Great!', brief: { title: 'Asha turns 30', occasionType: 'gala', guestCount: 40 } },
    });

    const res = await request(app)
      .post('/events/intake-chat')
      .set(bearer(owner.token))
      .send({ messages: [{ role: 'user', content: 'Done' }] });

    expect(res.body.done).toBe(true);
    expect(res.body.brief).toEqual(expect.objectContaining({ title: 'Asha turns 30', occasionType: 'other', guestCount: 40 }));
  });

  it('keeps chatting instead of returning an unusable brief', async () => {
    generateStructuredPlan.mockResolvedValue({ modelUsed: 'mock-model', data: { done: true, brief: { title: '' } } });

    const res = await request(app).post('/events/intake-chat').set(bearer(owner.token)).send({ messages: [] });

    expect(res.body.done).toBe(false);
  });
});
