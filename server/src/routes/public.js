import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Event from '../models/Event.js';
import Guest from '../models/Guest.js';

const router = Router();

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ error: result.array()[0].msg });
  }
  next();
}

router.get('/events/:publicId', async (req, res, next) => {
  try {
    const event = await Event.findOne({ publicId: req.params.publicId }).select(
      'title occasionType date location vibe publicId'
    );
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let invite = null;
    if (req.query.g) {
      const guest = await Guest.findOne({ eventId: event._id, inviteToken: req.query.g });
      if (guest) {
        invite = { name: guest.name, email: guest.email, status: guest.status };
      }
    }

    res.json({ ...event.toObject(), invite });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/events/:publicId/rsvp',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('attending').isBoolean().withMessage('attending must be true or false'),
    body('dietaryNotes').optional().trim(),
    body('inviteToken').optional().trim(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const event = await Event.findOne({ publicId: req.params.publicId });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      let guest = null;
      if (req.body.inviteToken) {
        guest = await Guest.findOne({ eventId: event._id, inviteToken: req.body.inviteToken });
      }

      if (guest) {
        guest.name = req.body.name;
        guest.attending = req.body.attending;
        guest.dietaryNotes = req.body.dietaryNotes || '';
        guest.status = req.body.attending ? 'accepted' : 'declined';
        guest.respondedAt = new Date();
        await guest.save();
      } else {
        guest = await Guest.create({
          eventId: event._id,
          name: req.body.name,
          attending: req.body.attending,
          dietaryNotes: req.body.dietaryNotes || '',
          status: req.body.attending ? 'accepted' : 'declined',
          respondedAt: new Date(),
        });
      }

      res.status(201).json(guest);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
