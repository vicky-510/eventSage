import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiters.js';
import { validateEventId, loadOwnedEvent } from '../middleware/ownership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateStructuredPlan, generateText } from '../utils/gemini.js';
import { buildPlanPrompt, buildReplanPrompt, buildIntakePrompt, buildAssistantChatPrompt } from '../utils/prompts.js';
import { sanitizePlan, sanitizeIntakeBrief } from '../utils/validatePlan.js';
import {
  MAX_CHAT_HISTORY,
  MAX_MESSAGE_LENGTH,
  MAX_INTAKE_MESSAGES,
  MAX_ASSISTANT_REPLY_LENGTH,
} from '../utils/constants.js';

// Mounted inside the authenticated /events router; every route here calls Gemini.
const router = Router();

const INTAKE_FALLBACK_REPLY = 'Could you tell me more about the event?';
const INTAKE_RETRY_REPLY = "Sorry, I didn't catch that — could you tell me a bit more?";

/** Keeps only well-formed chat turns, the most recent ones, each length-capped. */
function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
    .slice(-MAX_CHAT_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

function clipReply(text, fallback) {
  return String(text || fallback).slice(0, MAX_MESSAGE_LENGTH);
}

/** Generates a plan from `promptFor(event)` and stores the sanitized result. */
function planGenerationHandler(promptFor) {
  return asyncHandler(async (req, res) => {
    const { event } = req;
    const { data, modelUsed } = await generateStructuredPlan(promptFor(req));
    event.plan = sanitizePlan(data);
    await event.save();
    res.json({ event, modelUsed });
  });
}

// Conversational intake: no event exists yet, so this isn't scoped to :id.
// The frontend chats here first, then creates the event from the returned
// brief once the model reports done:true.
router.post(
  '/intake-chat',
  aiLimiter,
  [body('messages').isArray({ max: MAX_INTAKE_MESSAGES }).withMessage('messages must be an array')],
  validate,
  asyncHandler(async (req, res) => {
    const prompt = buildIntakePrompt(sanitizeHistory(req.body.messages));
    const { data, modelUsed } = await generateStructuredPlan(prompt);

    if (!data?.done) {
      return res.json({ done: false, reply: clipReply(data?.reply, INTAKE_FALLBACK_REPLY), modelUsed });
    }
    const brief = sanitizeIntakeBrief(data.brief);
    if (!brief) {
      return res.json({ done: false, reply: INTAKE_RETRY_REPLY, modelUsed });
    }
    res.json({ done: true, reply: clipReply(data.reply, 'Got it!'), brief, modelUsed });
  })
);

router.post(
  '/:id/generate-plan',
  aiLimiter,
  validateEventId,
  loadOwnedEvent(),
  planGenerationHandler((req) => buildPlanPrompt(req.event))
);

router.post(
  '/:id/replan',
  aiLimiter,
  validateEventId,
  [
    body('changeDescription', `changeDescription is required (max ${MAX_MESSAGE_LENGTH} characters)`)
      .isString()
      .trim()
      .isLength({ min: 1, max: MAX_MESSAGE_LENGTH }),
  ],
  validate,
  loadOwnedEvent(),
  planGenerationHandler((req) => buildReplanPrompt(req.event, req.body.changeDescription))
);

router.post(
  '/:id/chat',
  aiLimiter,
  validateEventId,
  [
    body('message', `message is required (max ${MAX_MESSAGE_LENGTH} characters)`)
      .isString()
      .trim()
      .isLength({ min: 1, max: MAX_MESSAGE_LENGTH }),
  ],
  validate,
  loadOwnedEvent(),
  asyncHandler(async (req, res) => {
    const { event } = req;
    const history = sanitizeHistory(event.assistantChat);
    const prompt = buildAssistantChatPrompt(event, history, req.body.message);
    const { data, modelUsed } = await generateText(prompt);
    const reply = data.slice(0, MAX_ASSISTANT_REPLY_LENGTH);

    event.assistantChat.push({ role: 'user', content: req.body.message }, { role: 'assistant', content: reply });
    event.assistantChat = event.assistantChat.slice(-MAX_CHAT_HISTORY);
    await event.save();

    res.json({ reply, modelUsed });
  })
);

export default router;
