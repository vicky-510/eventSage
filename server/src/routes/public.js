import { Router } from 'express';
import { body, param, query } from 'express-validator';
import Event from '../models/Event.js';
import Guest from '../models/Guest.js';
import { validate } from '../middleware/validate.js';
import { publicWriteLimiter } from '../middleware/rateLimiters.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import {
  MAX_NAME_LENGTH,
  MAX_LONG_TEXT_LENGTH,
  INVITE_TOKEN_BYTES,
  PUBLIC_EVENT_CACHE_CONTROL,
} from '../utils/constants.js';

// Guest-facing, unauthenticated routes. Only the fields a guest needs are ever
// exposed; budgets, plans and the guest list stay private to the host.
const router = Router();

const PUBLIC_EVENT_FIELDS = 'title occasionType date location vibe publicId';
const INVITE_TOKEN_LENGTH = INVITE_TOKEN_BYTES * 2; // hex-encoded

const publicIdRule = param('publicId').isHexadecimal().isLength({ min: 16, max: 16 }).withMessage('Invalid link');

async function findPublicEvent(publicId, select) {
  const event = await Event.findOne({ publicId }).select(select).lean();
  if (!event) throw new HttpError(404, 'Event not found');
  return event;
}

router.get(
  '/events/:publicId',
  [
    publicIdRule,
    query('g').optional().isHexadecimal().isLength({ min: INVITE_TOKEN_LENGTH, max: INVITE_TOKEN_LENGTH }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const event = await findPublicEvent(req.params.publicId, PUBLIC_EVENT_FIELDS);

    let invite = null;
    if (req.query.g) {
      const guest = await Guest.findOne({ eventId: event._id, inviteToken: req.query.g })
        .select('name email status')
        .lean();
      if (guest) invite = { name: guest.name, email: guest.email, status: guest.status };
      // Personalised to one guest: must never be stored by a shared cache.
      res.set('Cache-Control', 'private, no-store');
    } else {
      res.set('Cache-Control', PUBLIC_EVENT_CACHE_CONTROL);
    }

    const { _id, ...publicEvent } = event;
    res.json({ ...publicEvent, invite });
  })
);

router.post(
  '/events/:publicId/rsvp',
  publicWriteLimiter,
  [
    publicIdRule,
    body('name', `Name is required (max ${MAX_NAME_LENGTH} characters)`)
      .isString()
      .trim()
      .isLength({ min: 1, max: MAX_NAME_LENGTH }),
    body('attending').isBoolean({ strict: true }).withMessage('attending must be true or false'),
    body('dietaryNotes').optional({ values: 'falsy' }).isString().trim().isLength({ max: MAX_LONG_TEXT_LENGTH }),
    body('inviteToken')
      .optional({ values: 'falsy' })
      .isHexadecimal()
      .isLength({ min: INVITE_TOKEN_LENGTH, max: INVITE_TOKEN_LENGTH })
      .withMessage('Invalid invite link'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const event = await findPublicEvent(req.params.publicId, '_id');
    const { name, attending, dietaryNotes = '', inviteToken } = req.body;
    const response = {
      name,
      attending,
      dietaryNotes,
      status: attending ? 'accepted' : 'declined',
      respondedAt: new Date(),
    };

    // A personal invite link updates that guest's record; an open link adds a new guest.
    const guest =
      (inviteToken &&
        (await Guest.findOneAndUpdate({ eventId: event._id, inviteToken }, response, { new: true }).lean())) ||
      (await Guest.create({ eventId: event._id, ...response }));

    res.status(201).json(guest);
  })
);

export default router;
