import { validationResult } from 'express-validator';

/**
 * Runs after express-validator chains; responds 400 with the first failure
 * message so the client gets one clear, actionable error.
 * @type {import('express').RequestHandler}
 */
export function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ error: result.array()[0].msg });
  }
  next();
}
