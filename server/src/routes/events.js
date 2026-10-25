import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import { requireAuth } from '../middleware/auth.js';
import { generateStructuredPlan } from '../utils/gemini.js';
import { buildPlanPrompt, buildReplanPrompt } from '../utils/prompts.js';
import { sanitizePlan, sanitizeBudget } from '../utils/validatePlan.js';

const router = Router();
router.use(requireAuth);

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ error: result.array()[0].msg });
  }
  next();
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

router.post('/:id/generate-plan', async (req, res, next) => {
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

export default router;
