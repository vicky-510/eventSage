function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SEVERITIES = ['info', 'warning', 'critical'];

export function sanitizeMoodboard(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const colors = Array.isArray(raw.colors) ? raw.colors.filter((c) => HEX_COLOR.test(c)).slice(0, 6) : [];
  if (!isNonEmptyString(raw.themeName) || colors.length === 0) return null;
  return {
    themeName: raw.themeName.trim(),
    colors,
    description: isNonEmptyString(raw.description) ? raw.description.trim() : '',
  };
}

export function sanitizeInsights(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i) => isNonEmptyString(i?.message))
    .map((i) => ({
      severity: SEVERITIES.includes(i.severity) ? i.severity : 'info',
      message: i.message.trim(),
    }))
    .slice(0, 6);
}

export function sanitizePlan(raw) {
  const plan = { budget: [], timeline: [], checklist: [], ideas: [], moodboard: null, insights: [] };

  if (Array.isArray(raw?.budget)) {
    plan.budget = raw.budget
      .filter((b) => isNonEmptyString(b?.category) && typeof b?.amount === 'number')
      .map((b) => ({ category: b.category, amount: b.amount, spent: 0 }));
  }

  if (Array.isArray(raw?.timeline)) {
    plan.timeline = raw.timeline
      .filter((t) => isNonEmptyString(t?.label))
      .map((t) => ({ label: t.label, time: t.time || '', notes: t.notes || '' }));
  }

  if (Array.isArray(raw?.checklist)) {
    plan.checklist = raw.checklist
      .filter((c) => isNonEmptyString(c?.task))
      .map((c) => ({
        task: c.task,
        dueDate: c.dueDate ? new Date(c.dueDate) : undefined,
        status: ['todo', 'booked', 'paid'].includes(c.status) ? c.status : 'todo',
      }));
  }

  if (Array.isArray(raw?.ideas)) {
    plan.ideas = raw.ideas.filter(isNonEmptyString);
  }

  plan.moodboard = sanitizeMoodboard(raw?.moodboard);
  plan.insights = sanitizeInsights(raw?.insights);

  return plan;
}

export function sanitizeBudget(raw) {
  if (!Array.isArray(raw?.budget)) return [];
  return raw.budget
    .filter((b) => isNonEmptyString(b?.category) && typeof b?.amount === 'number')
    .map((b) => ({ category: b.category, amount: b.amount, spent: 0 }));
}

const INTAKE_OCCASIONS = ['wedding', 'birthday', 'community', 'other'];

export function sanitizeIntakeBrief(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!isNonEmptyString(raw.title)) return null;

  const dateVal = raw.date ? new Date(raw.date) : null;
  return {
    title: raw.title.trim(),
    occasionType: INTAKE_OCCASIONS.includes(raw.occasionType) ? raw.occasionType : 'other',
    date: dateVal && !Number.isNaN(dateVal.getTime()) ? dateVal : undefined,
    location: isNonEmptyString(raw.location) ? raw.location.trim() : '',
    guestCount: typeof raw.guestCount === 'number' && raw.guestCount > 0 ? raw.guestCount : undefined,
    budgetTotal: typeof raw.budgetTotal === 'number' && raw.budgetTotal > 0 ? raw.budgetTotal : undefined,
    vibe: isNonEmptyString(raw.vibe) ? raw.vibe.trim() : '',
  };
}
