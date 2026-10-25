# EventSage — Celebration & Event Planner

Built for **PromptWars Virtual** (Hack2skill, in collaboration with Google for Developers).

## Chosen Vertical

**Celebration & Event Planner** — a GenAI-powered assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas.

## Approach & Logic

EventSage turns a short event brief (occasion, date, location, guest count, budget, vibe) into a complete, editable plan in one AI call, then supports an agentic "re-plan" action for when real-world changes happen.

1. **Structured intake, not open chat.** A short form captures the event brief as structured fields, which keeps the AI prompt grounded and the output predictable — this avoids vague, unusable AI responses.
2. **One well-engineered prompt, strict JSON contract.** The backend sends a single Gemini prompt instructing the model to return budget, timeline, checklist, and ideas as a fixed JSON shape. The response is parsed and **sanitized server-side** (`server/src/utils/validatePlan.js`) — any malformed or missing fields are dropped rather than trusted, so a bad AI response never corrupts stored data or breaks the UI.
3. **Multi-model fallback chain.** AI calls walk an ordered list of Gemini models — `gemini-3.1-pro` → `gemini-3.5-flash` → `gemini-3.1-flash-lite` by default — trying the next one on error, timeout, or malformed output (`server/src/utils/gemini.js`). The chain is a single environment variable (`GEMINI_MODEL_CHAIN`, comma-separated) so models can be reordered, added, or swapped without a code change as Google ships newer versions.
4. **Agentic re-planning.** Rather than regenerating the whole plan from scratch, the "Re-plan" action sends only the current budget plus a plain-English description of what changed (e.g. "I lost ₹10,000 on a venue deposit") and asks the model to reallocate the remaining budget — this is the differentiator: context-aware adjustment, not a one-shot generator.
5. **Everything stays editable.** AI output is a starting point, not a locked answer — budget entries, checklist status, and timeline are all persisted to MongoDB and editable from the UI.
6. **Guest-facing surface.** Each event gets a public, unauthenticated RSVP link (`/e/:publicId`) so the tool is useful beyond the organizer.

## How the Solution Works

### Architecture
- **Frontend**: React + Vite, deployed to Netlify. No heavy UI framework — a small hand-written CSS theme (sandal/brown palette) keeps the client bundle and repo size small.
- **Backend**: Node.js + Express, deployed to Vercel as a serverless function (`server/api/index.js`).
- **Database**: MongoDB Atlas via Mongoose (`User`, `Event`, `Guest` collections).
- **AI**: Google Gemini API (`@google/generative-ai`), primary/fallback model wrapper described above.

### Authentication (security-first)
- Passwords hashed with **bcrypt** (cost factor 12) — never stored or logged in plaintext.
- **Short-lived access JWT** (15 min) returned to the client and held in memory only (never `localStorage`), to limit exposure if the client is compromised by XSS.
- **Refresh token** (7 days) stored as an **httpOnly, Secure, SameSite=Strict** cookie, with its hash stored server-side for revocation; rotated on every refresh.
- `/auth/login` and `/auth/signup` are rate-limited (`express-rate-limit`) against brute force.
- All inputs validated and sanitized server-side with `express-validator`.
- `helmet` for secure HTTP headers; CORS locked to the deployed frontend origin.
- `express-mongo-sanitize` strips Mongo query operators (`$gt`, `$where`, etc.) from request bodies/params to prevent NoSQL injection.
- Login errors are intentionally generic ("Invalid email or password") for both a wrong password and an unknown email, to avoid leaking which emails are registered.

### Accessibility
- Semantic landmarks (`<nav>`, `<main>`) and a visible skip-to-content link for keyboard/screen-reader users.
- Every form input has an associated `<label>`; errors are announced via `role="alert"`.
- All interactive controls (checklist status, RSVP, nav) are plain `<button>`/`<a>` elements, fully keyboard-operable with visible focus outlines.
- Palette checked against WCAG AA: all text/background and button-label color pairs meet or exceed 4.5:1 contrast.

### Core Features
- Email/password signup & login with secure session handling.
- Event creation (occasion, date, location, guest count, budget, vibe).
- AI-generated plan: budget breakdown, timeline, vendor checklist, theme ideas.
- Editable budget and checklist (status cycle: todo → booked → paid), persisted to MongoDB.
- AI re-plan: describe a real-world change, get the budget reallocated.
- Dashboard with event list, countdown, and budget-used indicator.
- Public, no-login guest RSVP page per event with a shareable link.

### Folder Structure
```
eventPlanner/
  client/        React + Vite frontend (Netlify)
  server/        Express backend (Vercel serverless)
    src/
      models/      Mongoose schemas
      routes/      auth, events, public (RSVP)
      middleware/  JWT auth guard, error handling
      utils/       Gemini wrapper, prompts, plan sanitizer, JWT helpers
    tests/         Jest + Supertest + mongodb-memory-server
  PLAN.md          Full design/build plan
```

## Setup

### Backend
```
cd server
cp .env.example .env   # fill in MongoDB Atlas URI, JWT secrets, Gemini API key
npm install
npm run dev
npm test                # runs the backend test suite
```

### Frontend
```
cd client
cp .env.example .env   # set VITE_API_URL to the backend URL
npm install
npm run dev
```

## Testing

**Backend** (`server/tests/`, Jest + Supertest + mongodb-memory-server):
- Signup: success, duplicate email rejected, weak password rejected.
- Login: success issues tokens, wrong password / unknown email both get the same generic error.
- Protected routes reject requests with no token or an invalid token.
- Event creation flow end-to-end with a real JWT.
- AI plan sanitization: malformed/partial AI JSON is cleaned rather than trusted.
- Gemini fallback chain: succeeds on the first model, falls through on failures, and fails safely when every model is down.

Run with `npm test` inside `server/`.

**Frontend** (`client/src/**/*.test.{js,jsx}`, Vitest + React Testing Library):
- `daysUntil` date-math utility (future/past/missing date).
- Login page renders accessible, labeled form fields and a reachable submit button.

Run with `npm test` inside `client/`.

**CI**: `.github/workflows/ci.yml` runs both suites (and the frontend build) on every push/PR to `main`.

## Assumptions

- Single-currency budgets; defaults to INR, but all amounts are plain numbers the user can relabel.
- One owner per event — no multi-editor collaboration in this version.
- The guest RSVP link is the access control for guests (no separate guest login); anyone with the link can RSVP.
- AI-suggested budgets, timelines, and vendor lists are a starting point and regional estimate — every value remains user-editable, since real costs vary by location and vendor.

## Deployment

- **Frontend** → Netlify (build command `npm run build`, publish directory `dist`, `_redirects` included for client-side routing).
- **Backend** → Vercel (serverless entry at `server/api/index.js`, routing configured in `server/vercel.json`).
- **Database** → MongoDB Atlas (connection string via `MONGO_URI` env var, never committed).
