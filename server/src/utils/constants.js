// Auth
export const BCRYPT_ROUNDS = 12;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const JWT_ALGORITHM = 'HS256';
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128; // bcrypt only reads the first 72 bytes; cap to stop huge-payload hashing

// Rate limiting (per IP, per window)
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const GLOBAL_RATE_LIMIT_MAX = 300;
export const AUTH_RATE_LIMIT_MAX = 10;
export const AI_RATE_LIMIT_MAX = 30;
export const PUBLIC_WRITE_RATE_LIMIT_MAX = 20;

// Request / field size limits
export const JSON_BODY_LIMIT = '100kb';
export const MAX_TITLE_LENGTH = 200;
export const MAX_SHORT_TEXT_LENGTH = 200;
export const MAX_LONG_TEXT_LENGTH = 1000;
export const MAX_NAME_LENGTH = 100;
export const MAX_PHONE_LENGTH = 25;
export const MAX_GUEST_COUNT = 100_000;
export const MAX_BUDGET = 1e10;
export const MAX_BULK_GUESTS = 200;
export const MAX_PLAN_LIST_ITEMS = 100;

// Chat / AI content limits
export const MAX_CHAT_HISTORY = 20;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_ASSISTANT_REPLY_LENGTH = 8000;
export const MAX_INTAKE_MESSAGES = 40;

// Gemini
export const GEMINI_MODEL_TIMEOUT_MS = 20_000;

// Pagination
export const DEFAULT_EVENTS_PAGE_SIZE = 50;
export const MAX_EVENTS_PAGE_SIZE = 100;

// Tokens embedded in shareable links
export const INVITE_TOKEN_BYTES = 12;

// Caching for the public (guest-facing) event view
export const PUBLIC_EVENT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';
