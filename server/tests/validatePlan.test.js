import { sanitizePlan, sanitizeBudget } from '../src/utils/validatePlan.js';

describe('sanitizePlan', () => {
  it('keeps only well-formed entries and drops malformed ones', () => {
    const raw = {
      budget: [
        { category: 'Venue', amount: 20000 },
        { category: '', amount: 5000 },
        { category: 'Catering', amount: 'not-a-number' },
      ],
      timeline: [{ label: 'Welcome', time: '10:00' }, { label: '' }],
      checklist: [{ task: 'Book DJ', status: 'invalid-status' }],
      ideas: ['Pastel balloons', '', 42],
    };

    const plan = sanitizePlan(raw);

    expect(plan.budget).toEqual([{ category: 'Venue', amount: 20000, spent: 0 }]);
    expect(plan.timeline).toEqual([{ label: 'Welcome', time: '10:00', notes: '' }]);
    expect(plan.checklist[0].status).toBe('todo');
    expect(plan.ideas).toEqual(['Pastel balloons']);
  });

  it('returns empty arrays when given garbage input', () => {
    const plan = sanitizePlan({ budget: 'nope', timeline: null });
    expect(plan).toEqual({ budget: [], timeline: [], checklist: [], ideas: [] });
  });
});

describe('sanitizeBudget', () => {
  it('extracts a valid budget array from a replan response', () => {
    const result = sanitizeBudget({ budget: [{ category: 'Decor', amount: 8000 }] });
    expect(result).toEqual([{ category: 'Decor', amount: 8000, spent: 0 }]);
  });

  it('returns an empty array when budget is missing', () => {
    expect(sanitizeBudget({})).toEqual([]);
  });
});
