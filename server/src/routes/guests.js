import { Router } from 'express';
import crypto from 'crypto';
import { body, param } from 'express-validator';
import Guest from '../models/Guest.js';
import { validate } from '../middleware/validate.js';
import { validateEventId, loadOwnedEvent } from '../middleware/ownership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { INVITE_TOKEN_BYTES, MAX_BULK_GUESTS, MAX_NAME_LENGTH, MAX_PHONE_LENGTH } from '../utils/constants.js';

// Mounted at /events/:id/guests inside the authenticated events router.
const router = Router({ mergeParams: true });

const PHONE_PATTERN = /^[+\d\s()-]*$/;

// Every route here only needs to know the event exists and is the caller's,
// so load just its _id instead of the whole document.
router.use(validateEventId, loadOwnedEvent({ select: '_id', lean: true }));

const validateGuestId = [param('guestId').isMongoId().withMessage('Invalid guest id'), validate];

function newGuest(eventId, name, phone) {
  return {
    eventId,
    name,
    phone,
    inviteToken: crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex'),
    status: 'not_sent',
  };
}

/** Parses one bulk entry (a name string or { name, phone }); throws 400 on bad input. */
function parseBulkEntry(raw) {
  const name = String(raw?.name ?? raw ?? '').trim();
  const phone = raw?.phone ? String(raw.phone).trim() : '';
  if (name.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, `Guest names must be at most ${MAX_NAME_LENGTH} characters`);
  }
  if (phone.length > MAX_PHONE_LENGTH || !PHONE_PATTERN.test(phone)) {
    throw new HttpError(400, `Invalid phone number for ${name || 'a guest'}`);
  }
  return { name, phone };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const guests = await Guest.find({ eventId: req.event._id }).sort({ respondedAt: -1, createdAt: -1 }).lean();
    res.json(guests);
  })
);

// Creates a guest with a personal RSVP link but no email required — for
// sharing by hand via WhatsApp, SMS, or any other channel.
router.post(
  '/link',
  [
    body('name', `Guest name is required (max ${MAX_NAME_LENGTH} characters)`)
      .isString()
      .trim()
      .isLength({ min: 1, max: MAX_NAME_LENGTH }),
    body('phone', `Phone may only contain digits, spaces, +, -, ( and ) (max ${MAX_PHONE_LENGTH} characters)`)
      .optional({ values: 'falsy' })
      .isString()
      .trim()
      .isLength({ max: MAX_PHONE_LENGTH })
      .matches(PHONE_PATTERN),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const guest = await Guest.create(newGuest(req.event._id, req.body.name, req.body.phone || ''));
    res.status(201).json(guest);
  })
);

// Same as /link but for a whole list at once, so adding a guest list is one
// round trip and one insert instead of one per name.
router.post(
  '/bulk',
  [body('guests').isArray({ min: 1, max: MAX_BULK_GUESTS }).withMessage(`Provide 1-${MAX_BULK_GUESTS} guests`)],
  validate,
  asyncHandler(async (req, res) => {
    const seen = new Set();
    const entries = [];
    for (const raw of req.body.guests) {
      const { name, phone } = parseBulkEntry(raw);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      entries.push(newGuest(req.event._id, name, phone));
    }
    if (entries.length === 0) throw new HttpError(400, 'Provide at least one guest');

    const guests = await Guest.insertMany(entries);
    res.status(201).json(guests);
  })
);

// Called right after the host actually shares a guest's link, so the guest
// moves from "not sent" to "awaiting response" only once it's really been sent.
router.post(
  '/:guestId/mark-sent',
  validateGuestId,
  asyncHandler(async (req, res) => {
    const filter = { _id: req.params.guestId, eventId: req.event._id };
    // Atomic conditional update: a no-op if the guest was already marked sent.
    const guest =
      (await Guest.findOneAndUpdate(
        { ...filter, status: 'not_sent' },
        { status: 'invited', sentAt: new Date() },
        { new: true }
      ).lean()) ?? (await Guest.findOne(filter).lean());
    if (!guest) throw new HttpError(404, 'Guest not found');
    res.json(guest);
  })
);

router.delete(
  '/:guestId',
  validateGuestId,
  asyncHandler(async (req, res) => {
    const { deletedCount } = await Guest.deleteOne({ _id: req.params.guestId, eventId: req.event._id });
    if (deletedCount === 0) throw new HttpError(404, 'Guest not found');
    res.json({ ok: true });
  })
);

export default router;
