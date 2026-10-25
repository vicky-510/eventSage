function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

export function sanitizePlan(raw) {
  const plan = { budget: [], timeline: [], checklist: [], ideas: [] };

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

  return plan;
}

export function sanitizeBudget(raw) {
  if (!Array.isArray(raw?.budget)) return [];
  return raw.budget
    .filter((b) => isNonEmptyString(b?.category) && typeof b?.amount === 'number')
    .map((b) => ({ category: b.category, amount: b.amount, spent: 0 }));
}
