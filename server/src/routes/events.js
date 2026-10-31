import { Router } from 'express';
import { body, query } from 'express-validator';
import Event from '../models/Event.js';
import Guest from '../models/Guest.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { validateEventId, loadOwnedEvent } from '../middleware/ownership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sanitizePlanPatch } from '../utils/validatePlan.js';
import aiRoutes from './ai.js';
import guestRoutes from './guests.js';
import {
  DEFAULT_EVENTS_PAGE_SIZE,
  MAX_EVENTS_PAGE_SIZE,
  MAX_TITLE_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  MAX_LONG_TEXT_LENGTH,
  MAX_GUEST_COUNT,
  MAX_BUDGET,
} from '../utils/constants.js';

const router = Router();
router.use(requireAuth);
router.use(aiRoutes);
router.use('/:id/guests', guestRoutes);

const EDITABLE_FIELDS = ['title', 'occasionType', 'date', 'location', 'guestCount', 'budgetTotal', 'vibe'];

// The dashboard only needs summary data; the chat transcript can be large and
// is fetched with the single-event view instead.
const LIST_PROJECTION = '-assistantChat';

/**
 * Validation for event fields, shared by create (title required) and update
 * (everything optional). Empty optional values are allowed so a cleared form
 * field doesn't fail validation.
 */
function eventFieldRules({ titleRequired }) {
  const optional = { values: 'falsy' };
  const title = body('title', `Title is required (max ${MAX_TITLE_LENGTH} characters)`)
    .isString()
    .trim()
    .isLength({ min: 1, max: MAX_TITLE_LENGTH });
  return [
    titleRequired ? title : title.optional(),
    body('occasionType').optional(optional).isString().trim().isLength({ max: MAX_SHORT_TEXT_LENGTH }),
    body('date').optional(optional).isISO8601().withMessage('Date must be a valid date'),
    body('location').optional(optional).isString().trim().isLength({ max: MAX_SHORT_TEXT_LENGTH }),
    body('guestCount')
      .optional(optional)
      .isInt({ min: 0, max: MAX_GUEST_COUNT })
      .withMessage('Guest count must be a whole number of 0 or more')
      .toInt(),
    body('budgetTotal')
      .optional(optional)
      .isFloat({ min: 0, max: MAX_BUDGET })
      .withMessage('Budget must be a number of 0 or more')
      .toFloat(),
    body('vibe').optional(optional).isString().trim().isLength({ max: MAX_LONG_TEXT_LENGTH }),
  ];
}

function pickEditableFields(source) {
  return Object.fromEntries(EDITABLE_FIELDS.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: MAX_EVENTS_PAGE_SIZE }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { limit = DEFAULT_EVENTS_PAGE_SIZE, skip = 0 } = req.query;
    const events = await Event.find({ ownerId: req.userId })
      .select(LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json(events);
  })
);

router.post(
  '/',
  eventFieldRules({ titleRequired: true }),
  validate,
  asyncHandler(async (req, res) => {
    const event = await Event.create({ ...pickEditableFields(req.body), ownerId: req.userId });
    res.status(201).json(event);
  })
);

router.get(
  '/:id',
  validateEventId,
  loadOwnedEvent({ lean: true }),
  (req, res) => res.json(req.event)
);

router.patch(
  '/:id',
  validateEventId,
  [...eventFieldRules({ titleRequired: false }), body('plan').optional().isObject().withMessage('plan must be an object')],
  validate,
  loadOwnedEvent(),
  asyncHandler(async (req, res) => {
    const { event } = req;
    Object.assign(event, pickEditableFields(req.body));
    if (req.body.plan) {
      // Merge rather than replace, so a caller patching one plan field (e.g.
      // just the checklist) can never wipe out the rest of the plan.
      event.plan = { ...event.plan.toObject(), ...sanitizePlanPatch(req.body.plan) };
    }
    await event.save();
    res.json(event);
  })
);

router.delete(
  '/:id',
  validateEventId,
  loadOwnedEvent({ select: '_id', lean: true }),
  asyncHandler(async (req, res) => {
    const eventId = req.event._id;
    await Promise.all([Event.deleteOne({ _id: eventId }), Guest.deleteMany({ eventId })]);
    res.json({ ok: true });
  })
);

export default router;
