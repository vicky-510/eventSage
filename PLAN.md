# EventSage — Celebration & Event Planner (PromptWars Virtual)

## 1. Vertical & Positioning
**Chosen vertical:** Celebration & Event Planner
**Persona:** A person organizing a wedding, birthday, or community event who needs a budget, timeline, vendor checklist, and personalized ideas — without hiring a planner.

**One-line pitch:** EventSage turns a short description of an event into a full AI-generated plan (budget split, day-of timeline, vendor checklist, theme ideas) that the user can edit, track, and share with guests.

**Why this stands out for judging:**
- Problem Statement Alignment: directly builds every item listed in the brief (budgets, timelines, vendor checklists, personalized ideas).
- Logical decision-making: AI output is structured (JSON schema), re-planning is context-aware (e.g. "I overspent on venue" triggers real budget reallocation, not a generic chat reply).
- Practical/real-world usability: guest RSVP page + shareable plan, not just an internal dashboard.

## 2. Hackathon Constraints (hard requirements)
- Public GitHub repo, **single branch**, **< 10 MB** total size.
- No `node_modules`, build artifacts, or binary assets committed — strict `.gitignore`.
- No secrets committed — `.env.example` only, real `.env` git-ignored.
- README must cover: chosen vertical, approach/logic, how it works, assumptions.
- Evaluation weighting (highest to lowest impact): Code Quality & Security (High) → Efficiency & Testing (Medium) → Accessibility & polish (Low, but needed for a perfect score).

## 3. Tech Stack
| Layer | Choice |
|---|---|
| Frontend | React + Vite, plain CSS (small, no heavy UI kit to keep repo size down) |
| Frontend hosting | Netlify |
| Backend | Node.js + Express |
| Backend hosting | Vercel (serverless functions) |
| Database | MongoDB Atlas (Mongoose ODM) |
| AI | Gemini API (`@google/generative-ai`) — model fallback chain: `gemini-3.1-pro` (preview) → `gemini-3.5-flash` (stable) → `gemini-3.1-flash-lite` (stable), tried in order until one succeeds — aligns with "Collaborating with Google for Developers". Verify exact model IDs in Google AI Studio before building, since 2.5-series models are being shut down (Oct 16, 2026) and 3.x naming may still shift. |
| Auth | Custom email/password, JWT + httpOnly refresh cookie |
| Testing | Jest + Supertest + mongodb-memory-server (backend API tests) |

## 4. Authentication Design (security-first)
- **Signup**: email + password (min 10 chars, validated with `express-validator`), password hashed with **bcrypt (cost 12)**. Duplicate-email check. Generic error messages (no "email already exists" leakage... actually for signup UX we do tell them, but login errors stay generic: "invalid credentials" for both wrong email/password).
- **Login**: verify hash, issue:
  - Short-lived **access JWT** (15 min) returned in response body, held in memory on the client (not localStorage — avoids XSS token theft).
  - **Refresh token** (7 days) set as an **httpOnly, Secure, SameSite=Strict** cookie, stored hashed in DB for revocation support.
- **Refresh flow**: `/auth/refresh` reads the cookie, issues a new access token; rotates refresh token.
- **Logout**: clears cookie + revokes stored refresh token hash.
- **Protections**:
  - `helmet` for security headers.
  - `express-rate-limit` on `/auth/login` and `/auth/signup` (e.g. 10 req / 15 min / IP) to blunt brute force.
  - CORS locked to the deployed Netlify origin only.
  - All inputs validated/sanitized server-side with `express-validator`.
  - Passwords never logged or returned in any API response.
  - JWT secret, Mongo URI, Gemini key only via environment variables.

## 5. Core Features (scope for submission)
1. **Auth**: signup, login, logout, protected routes (JWT middleware).
2. **Event creation**: form captures occasion, date, location, guest count, budget, vibe/notes → saved to MongoDB.
3. **AI Plan Generation** (`POST /ai/generate-plan`): single well-engineered Gemini prompt, given the event brief, returns strict JSON. The model call walks a configurable chain (`GEMINI_MODEL_CHAIN`, comma-separated, default `gemini-3.1-pro,gemini-3.5-flash,gemini-3.1-flash-lite`), trying each model in order until one returns a response that parses as valid JSON, so a single model's outage, deprecation, or quota limit doesn't take down plan generation. Response shape:
   - `budget`: category → amount breakdown
   - `timeline`: ordered list of {time/day, activity}
   - `checklist`: vendor/task list with suggested due dates (counted back from event date)
   - `ideas`: theme/decor/activity suggestions (text)
   Response is validated against expected JSON shape server-side before saving; falls back gracefully (editable empty sections) if the AI returns malformed output.
4. **Editable plan**: user can edit/check off budget items and checklist tasks; changes persist to MongoDB.
5. **Guest RSVP page**: public read-only link per event (`/e/:publicId`) for guests to RSVP (name, attending yes/no, dietary notes) — no login required for guests.
6. **Dashboard**: list of the logged-in user's events with countdown and budget-used indicator.
7. **Re-plan action**: user describes a change ("lost ₹10k on venue deposit") → AI re-optimizes remaining budget categories only (keeps this agentic angle as the differentiator).

Explicitly out of scope for submission (to protect the 10 MB / time budget): image/moodboard generation, real-time websocket collaboration, payment integration.

## 6. Data Models (MongoDB / Mongoose)
- **User**: `email` (unique, indexed), `passwordHash`, `refreshTokenHash`, `createdAt`.
- **Event**: `ownerId`, `publicId` (for guest link), `title`, `occasionType`, `date`, `location`, `guestCount`, `budgetTotal`, `vibe/notes`, `plan` (embedded: budget[], timeline[], checklist[], ideas[]), `createdAt`.
- **Guest** (RSVP): `eventId`, `name`, `attending`, `dietaryNotes`, `createdAt`.

## 7. API Routes
```
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /events              (list own events)
POST   /events              (create)
GET    /events/:id          (own event, full detail)
PATCH  /events/:id          (edit plan/budget/checklist)
DELETE /events/:id

POST   /ai/generate-plan    (body: event brief -> returns structured plan)
POST   /ai/replan           (body: event id + change description -> updated budget)

GET    /public/events/:publicId   (guest-facing read-only view)
POST   /public/events/:publicId/rsvp
```

## 8. Frontend Pages
- `/signup`, `/login`
- `/dashboard` — event list + "New Event"
- `/events/new` — brief intake form
- `/events/:id` — plan view: budget table, timeline, checklist (editable), ideas, "Re-plan" box, share-link button
- `/e/:publicId` — public guest RSVP page (no auth)

Accessibility baseline: semantic HTML (`<label>`, `<button>`, landmarks), visible focus states, sufficient color contrast, keyboard-operable forms and checklist toggles.

**Visual theme:** sandal/brown palette — warm neutrals, no third-party UI kit needed (keeps repo small). Suggested tokens:
- Background: `#FAF3E8` (sandal/cream)
- Surface/cards: `#FFFFFF` / `#F3E6D3`
- Primary accent: `#8B5E34` (brown)
- Primary hover/dark: `#6B4423`
- Secondary accent: `#C9A876` (sandal/tan)
- Text: `#3E2C1C` (dark brown) on light backgrounds
- Borders/dividers: `#D8C3A5`
- Success/RSVP-yes: `#6B8E4E` (muted olive, stays warm-toned)
- Danger/RSVP-no: `#A6513A` (muted terracotta, stays in-palette rather than a jarring red)
Contrast of text/background pairs to be checked against WCAG AA during the accessibility pass (build order step 7).

## 9. Testing Plan
- Backend (Jest + Supertest + mongodb-memory-server, no real Atlas needed for CI):
  - Signup: success, duplicate email rejected, weak password rejected.
  - Login: success issues tokens, wrong password rejected, rate limit triggers after N attempts.
  - Events: protected routes reject requests without a valid access token.
  - AI route: mocked Gemini response is validated/shaped correctly before save; forced failures on earlier models in the chain confirm it falls through to the next one.
- Keep test suite small and fast — a handful of high-value cases, not exhaustive coverage.

## 10. Repo Structure
```
eventPlanner/
  client/           (Vite React app — Netlify)
  server/           (Express app — Vercel serverless)
    src/
      models/
      middleware/   (auth, error handling, rate limit)
      routes/
      utils/        (gemini.js, token helpers)
    tests/
  PLAN.md
  README.md
  .gitignore
```

## 11. Build Order (milestones)
1. Backend skeleton + MongoDB connection + User model + auth routes (signup/login/refresh/logout) + tests.
2. Event model + CRUD routes (protected) + tests.
3. Gemini integration (`/ai/generate-plan`, `/ai/replan`) with strict JSON-schema prompting + validation, a multi-model fallback chain wrapper (`utils/gemini.js`), and env-configurable model list.
4. Frontend: auth pages, dashboard, event intake form, wired to backend.
5. Frontend: plan view (editable budget/timeline/checklist), re-plan UI.
6. Public guest RSVP page.
7. Accessibility pass + responsive/UI polish.
8. README (vertical, approach, how it works, assumptions) + deployment to Netlify/Vercel/Atlas + final repo size/branch check.

## 12. Assumptions (to state in README)
- Single-currency budgets (defaults to INR, editable label).
- One owner per event; no multi-editor collaboration in this version.
- Guest RSVP page requires no guest login, trusting the shared link as access control.
- AI suggestions are a starting point; all values remain user-editable, since AI budget/vendor estimates are regional and can vary.

---
Once this plan is approved, implementation proceeds in the milestone order above.
