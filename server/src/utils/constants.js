// Auth
export const BCRYPT_ROUNDS = 12;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const AUTH_RATE_LIMIT_MAX = 10;
export const AI_RATE_LIMIT_MAX = 30;

// Chat / AI content limits
export const MAX_CHAT_HISTORY = 20;
export const MAX_MESSAGE_LENGTH = 2000;

// Gemini
export const GEMINI_MODEL_TIMEOUT_MS = 20_000;

// Pagination
export const DEFAULT_EVENTS_PAGE_SIZE = 50;
export const MAX_EVENTS_PAGE_SIZE = 100;
