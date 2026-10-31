/**
 * Wraps an async Express handler so a rejected promise is forwarded to the
 * error middleware instead of becoming an unhandled rejection (Express 4
 * doesn't do this on its own).
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<unknown>} fn
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
