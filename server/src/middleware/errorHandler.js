const GENERIC_MESSAGE = 'Something went wrong';

/**
 * Central error handler. Only messages explicitly marked client-safe
 * (`publicMessage`, or body-parser's `expose`) ever reach the client, so
 * internals like stack traces or DB errors never leak.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(err, req, res, _next) {
  // Malformed ObjectIds or schema violations that slipped past route validation.
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  const message = err.publicMessage || (err.expose && status < 500 ? err.message : GENERIC_MESSAGE);
  res.status(status).json({ error: message });
}

/** @type {import('express').RequestHandler} */
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}
