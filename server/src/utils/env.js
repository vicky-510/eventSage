const REQUIRED_ENV_VARS = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'GEMINI_API_KEY'];

/**
 * Fails fast at startup with a clear message instead of failing later, mid-request,
 * with an obscure error (e.g. jwt.sign with an undefined secret).
 * @throws {Error} if any required variable is missing.
 */
export function assertRequiredEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
