import { MAX_PLAN_LIST_ITEMS, MAX_SHORT_TEXT_LENGTH, MAX_LONG_TEXT_LENGTH } from './constants.js';

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SEVERITIES = ['info', 'warning', 'critical'];
const CHECKLIST_STATUSES = ['todo', 'booked', 'paid'];
const INTAKE_OCCASIONS = ['wedding', 'birthday', 'community', 'other'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNonNegativeNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function toValidDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function cap(list) {
  return list.slice(0, MAX_PLAN_LIST_ITEMS);
}

/**
 * @param {unknown} raw
 * @param {{ keepSpent: boolean }} options `keepSpent` preserves user-tracked
 *   spending (manual edits); AI output always starts from zero spent.
 */
function sanitizeBudgetItems(raw, { keepSpent }) {
  if (!Array.isArray(raw)) return [];
  return cap(
    raw
      .filter((b) => isNonEmptyString(b?.category) && isNonNegativeNumber(b?.amount))
      .map((b) => ({
        category: clip(b.category, MAX_SHORT_TEXT_LENGTH),
        amount: b.amount,
        spent: keepSpent && isNonNegativeNumber(b.spent) ? b.spent : 0,
      }))
  );
}

function sanitizeTimeline(raw) {
  if (!Array.isArray(raw)) return [];
  return cap(
    raw
      .filter((t) => isNonEmptyString(t?.label))
      .map((t) => ({
        label: clip(t.label, MAX_SHORT_TEXT_LENGTH),
        time: clip(t.time, MAX_SHORT_TEXT_LENGTH),
        notes: clip(t.notes, MAX_LONG_TEXT_LENGTH),
      }))
  );
}

function sanitizeChecklist(raw) {
  if (!Array.isArray(raw)) return [];
  return cap(
    raw
      .filter((c) => isNonEmptyString(c?.task))
      .map((c) => ({
        task: clip(c.task, MAX_SHORT_TEXT_LENGTH),
        dueDate: toValidDate(c.dueDate),
        status: CHECKLIST_STATUSES.includes(c.status) ? c.status : 'todo',
      }))
  );
}

function sanitizeIdeas(raw) {
  if (!Array.isArray(raw)) return [];
  return cap(raw.filter(isNonEmptyString).map((idea) => clip(idea, MAX_LONG_TEXT_LENGTH)));
}

/** @returns {{ themeName: string, colors: string[], description: string } | null} */
export function sanitizeMoodboard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const colors = Array.isArray(raw.colors) ? raw.colors.filter((c) => HEX_COLOR.test(c)).slice(0, 6) : [];
  if (!isNonEmptyString(raw.themeName) || colors.length === 0) return null;
  return {
    themeName: clip(raw.themeName, MAX_SHORT_TEXT_LENGTH),
    colors,
    description: clip(raw.description, MAX_LONG_TEXT_LENGTH),
  };
}

/** @returns {{ severity: 'info' | 'warning' | 'critical', message: string }[]} */
export function sanitizeInsights(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => isNonEmptyString(i?.message))
    .map((i) => ({
      severity: SEVERITIES.includes(i.severity) ? i.severity : 'info',
      message: clip(i.message, MAX_LONG_TEXT_LENGTH),
    }))
    .slice(0, 6);
}

/**
 * Turns an untrusted AI response into a well-formed plan. Malformed entries
 * are dropped rather than trusted, so a bad model response can never corrupt
 * stored data or break the UI.
 */
export function sanitizePlan(raw) {
  return {
    budget: sanitizeBudgetItems(raw?.budget, { keepSpent: false }),
    timeline: sanitizeTimeline(raw?.timeline),
    checklist: sanitizeChecklist(raw?.checklist),
    ideas: sanitizeIdeas(raw?.ideas),
    moodboard: sanitizeMoodboard(raw?.moodboard),
    insights: sanitizeInsights(raw?.insights),
  };
}

/**
 * Sanitizes a partial plan sent by the client when editing. Only the keys
 * actually present are returned, so the caller can merge them over the stored
 * plan without wiping the parts that weren't edited.
 */
export function sanitizePlanPatch(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const patch = {};
  if ('budget' in raw) patch.budget = sanitizeBudgetItems(raw.budget, { keepSpent: true });
  if ('timeline' in raw) patch.timeline = sanitizeTimeline(raw.timeline);
  if ('checklist' in raw) patch.checklist = sanitizeChecklist(raw.checklist);
  if ('ideas' in raw) patch.ideas = sanitizeIdeas(raw.ideas);
  if ('moodboard' in raw) patch.moodboard = sanitizeMoodboard(raw.moodboard);
  if ('insights' in raw) patch.insights = sanitizeInsights(raw.insights);
  return patch;
}

/** Extracts just the budget from a replan response. */
export function sanitizeBudget(raw) {
  return sanitizeBudgetItems(raw?.budget, { keepSpent: false });
}

/** Validates the structured brief produced by the conversational intake chat. */
export function sanitizeIntakeBrief(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!isNonEmptyString(raw.title)) return null;

  return {
    title: clip(raw.title, MAX_SHORT_TEXT_LENGTH),
    occasionType: INTAKE_OCCASIONS.includes(raw.occasionType) ? raw.occasionType : 'other',
    date: toValidDate(raw.date),
    location: clip(raw.location, MAX_SHORT_TEXT_LENGTH),
    guestCount: typeof raw.guestCount === 'number' && raw.guestCount > 0 ? raw.guestCount : undefined,
    budgetTotal: typeof raw.budgetTotal === 'number' && raw.budgetTotal > 0 ? raw.budgetTotal : undefined,
    vibe: clip(raw.vibe, MAX_LONG_TEXT_LENGTH),
  };
}
