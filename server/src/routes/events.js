import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import { requireAuth } from '../middleware/auth.js';
import { generateStructuredPlan, generateText } from '../utils/gemini.js';
import { buildPlanPrompt, buildReplanPrompt, buildIntakePrompt, buildAssistantChatPrompt } from '../utils/prompts.js';
import { sanitizePlan, sanitizeBudget, sanitizeIntakeBrief } from '../utils/validatePlan.js';

const router = Router();
router.use(requireAuth);

// AI calls are the most expensive thing this API does, so they get their own,
// tighter limit on top of whatever's in front of the whole app.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please slow down and try again shortly' },
});

const MAX_CHAT_HISTORY = 20;

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ error: result.array()[0].msg });
  }
  next();
}

function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .slice(-MAX_CHAT_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

router.get('/', async (req, res, next) => {
  try {
    const events = await Event.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  [body('title').trim().notEmpty().withMessage('Title is required')],
  validate,
  async (req, res, next) => {
    try {
      const { title, occasionType, date, location, guestCount, budgetTotal, vibe } = req.body;
      const event = await Event.create({
        ownerId: req.userId,
        title,
        occasionType,
        date,
        location,
        guestCount,
        budgetTotal,
        vibe,
      });
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }
);

// Conversational intake: no event exists yet, so this isn't scoped to :id.
// The frontend chats here first, then POSTs the returned brief to create the
// event once the model reports done:true.
router.post('/intake-chat', aiLimiter, [body('messages').isArray()], validate, async (req, res, next) => {
  try {
    const messages = sanitizeHistory(req.body.messages);
    const prompt = buildIntakePrompt(messages);
    const { data, modelUsed } = await generateStructuredPlan(prompt);

    if (data?.done) {
      const brief = sanitizeIntakeBrief(data.brief);
      if (!brief) {
        return res.json({ done: false, reply: "Sorry, I didn't catch that — could you tell me a bit more?", modelUsed });
      }
      return res.json({ done: true, reply: String(data.reply || 'Got it!').slice(0, 2000), brief, modelUsed });
    }

    res.json({ done: false, reply: String(data?.reply || "Could you tell me more about the event?").slice(0, 2000), modelUsed });
  } catch (err) {
    next(err);
  }
});

async function findOwnedEvent(req, res) {
  const event = await Event.findOne({ _id: req.params.id, ownerId: req.userId });
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return null;
  }
  return event;
}

router.get('/:id', async (req, res, next) => {
  try {
    const event = await findOwnedEvent(req, res);
    if (!event) return;
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const event = await findOwnedEvent(req, res);
    if (!event) return;

    const allowed = ['title', 'occasionType', 'date', 'location', 'guestCount', 'budgetTotal', 'vibe', 'plan'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) event[key] = req.body[key];
    }
    await event.save();
    res.json(event);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const event = await findOwnedEvent(req, res);
    if (!event) return;
    await event.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/generate-plan', aiLimiter, async (req, res, next) => {
  try {
    const event = await findOwnedEvent(req, res);
    if (!event) return;

    const prompt = buildPlanPrompt(event);
    const { data, modelUsed } = await generateStructuredPlan(prompt);
    event.plan = sanitizePlan(data);
    await event.save();

    res.json({ event, modelUsed });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/replan',
  aiLimiter,
  [body('changeDescription').trim().notEmpty().withMessage('changeDescription is required')],
  validate,
  async (req, res, next) => {
    try {
      const event = await findOwnedEvent(req, res);
      if (!event) return;

      const prompt = buildReplanPrompt(event, req.body.changeDescription);
      const { data, modelUsed } = await generateStructuredPlan(prompt);
      event.plan.budget = sanitizeBudget(data);
      await event.save();

      res.json({ event, modelUsed });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/chat',
  aiLimiter,
  [body('message').trim().notEmpty().isLength({ max: 2000 }).withMessage('message is required (max 2000 chars)')],
  validate,
  async (req, res, next) => {
    try {
      const event = await findOwnedEvent(req, res);
      if (!event) return;

      const history = sanitizeHistory(event.assistantChat);
      const prompt = buildAssistantChatPrompt(event, history, req.body.message);
      const { data: reply, modelUsed } = await generateText(prompt);

      event.assistantChat.push({ role: 'user', content: req.body.message });
      event.assistantChat.push({ role: 'assistant', content: reply });
      event.assistantChat = event.assistantChat.slice(-MAX_CHAT_HISTORY);
      await event.save();

      res.json({ reply, modelUsed });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
