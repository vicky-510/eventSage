import { param } from 'express-validator';
import Event from '../models/Event.js';
import { validate } from './validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

/** Rejects a non-ObjectId `:id` with a 400 before it ever reaches a query. */
export const validateEventId = [param('id').isMongoId().withMessage('Invalid event id'), validate];

/**
 * Loads the event in `:id` only if it belongs to the signed-in user, and
 * attaches it as `req.event`. Responds 404 (not 403) for someone else's event
 * so event ids can't be probed for existence.
 * @param {{ select?: string, lean?: boolean }} [options] Projection and
 *   lean-ness, so routes that only need ownership don't load the whole document.
 * @returns {import('express').RequestHandler}
 */
export function loadOwnedEvent({ select, lean = false } = {}) {
  return asyncHandler(async (req, res, next) => {
    const query = Event.findOne({ _id: req.params.id, ownerId: req.userId });
    if (select) query.select(select);
    if (lean) query.lean();
    const event = await query;
    if (!event) throw new HttpError(404, 'Event not found');
    req.event = event;
    next();
  });
}
