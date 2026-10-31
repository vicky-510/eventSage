import {
  sanitizePlan,
  sanitizePlanPatch,
  sanitizeBudget,
  sanitizeMoodboard,
  sanitizeInsights,
  sanitizeIntakeBrief,
} from '../src/utils/validatePlan.js';
import { MAX_PLAN_LIST_ITEMS } from '../src/utils/constants.js';

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
      moodboard: { themeName: 'Golden Hour', colors: ['#8B5E34', '#C9A876', 'not-a-color'], description: 'Warm tones' },
      insights: [{ severity: 'warning', message: 'Catering looks low for 50 guests' }, { message: '' }],
    };

    const plan = sanitizePlan(raw);

    expect(plan.budget).toEqual([{ category: 'Venue', amount: 20000, spent: 0 }]);
    expect(plan.timeline).toEqual([{ label: 'Welcome', time: '10:00', notes: '' }]);
    expect(plan.checklist[0].status).toBe('todo');
    expect(plan.ideas).toEqual(['Pastel balloons']);
    expect(plan.moodboard).toEqual({ themeName: 'Golden Hour', colors: ['#8B5E34', '#C9A876'], description: 'Warm tones' });
    expect(plan.insights).toEqual([{ severity: 'warning', message: 'Catering looks low for 50 guests' }]);
  });

  it('returns empty arrays and a null moodboard when given garbage input', () => {
    const plan = sanitizePlan({ budget: 'nope', timeline: null });
    expect(plan).toEqual({ budget: [], timeline: [], checklist: [], ideas: [], moodboard: null, insights: [] });
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

describe('sanitizeMoodboard', () => {
  it('rejects a moodboard with no valid hex colors', () => {
    expect(sanitizeMoodboard({ themeName: 'Golden Hour', colors: ['not-a-color'] })).toBeNull();
  });

  it('rejects a missing theme name', () => {
    expect(sanitizeMoodboard({ colors: ['#8B5E34'] })).toBeNull();
  });
});

describe('sanitizeInsights', () => {
  it('defaults an invalid severity to info', () => {
    expect(sanitizeInsights([{ severity: 'nonsense', message: 'Something to watch' }])).toEqual([
      { severity: 'info', message: 'Something to watch' },
    ]);
  });

  it('returns an empty array for non-array input', () => {
    expect(sanitizeInsights(null)).toEqual([]);
  });
});

describe('sanitizeIntakeBrief', () => {
  it('accepts a well-formed brief and falls back occasionType to other', () => {
    const brief = sanitizeIntakeBrief({
      title: "Maya's Birthday",
      occasionType: 'not-a-real-type',
      date: '2026-12-01',
      location: 'Goa',
      guestCount: 25,
      budgetTotal: 150000,
      vibe: 'beach, pastel',
    });
    expect(brief.title).toBe("Maya's Birthday");
    expect(brief.occasionType).toBe('other');
    expect(brief.guestCount).toBe(25);
  });

  it('rejects a brief with no title', () => {
    expect(sanitizeIntakeBrief({ occasionType: 'birthday' })).toBeNull();
  });
});

describe('sanitizePlanPatch', () => {
  it('returns only the keys that were sent, so unedited parts of the plan survive a merge', () => {
    const patch = sanitizePlanPatch({ checklist: [{ task: 'Book DJ', status: 'booked' }] });
    expect(Object.keys(patch)).toEqual(['checklist']);
    expect(patch.checklist[0]).toEqual(expect.objectContaining({ task: 'Book DJ', status: 'booked' }));
  });

  it('keeps user-tracked spending but drops negative or non-numeric values', () => {
    const patch = sanitizePlanPatch({
      budget: [
        { category: 'Venue', amount: 1000, spent: 400 },
        { category: 'Decor', amount: 500, spent: -10 },
        { category: 'Food', amount: -1 },
      ],
    });
    expect(patch.budget).toEqual([
      { category: 'Venue', amount: 1000, spent: 400 },
      { category: 'Decor', amount: 500, spent: 0 },
    ]);
  });

  it('caps list sizes and string lengths', () => {
    const ideas = Array.from({ length: MAX_PLAN_LIST_ITEMS + 50 }, () => 'y'.repeat(5000));
    const patch = sanitizePlanPatch({ ideas });
    expect(patch.ideas).toHaveLength(MAX_PLAN_LIST_ITEMS);
    expect(patch.ideas[0].length).toBeLessThan(5000);
  });

  it('returns an empty patch for non-object input', () => {
    expect(sanitizePlanPatch('nope')).toEqual({});
    expect(sanitizePlanPatch(null)).toEqual({});
  });
});

describe('sanitizePlan with AI output', () => {
  it('always resets spending to zero, whatever the model claims', () => {
    const plan = sanitizePlan({ budget: [{ category: 'Venue', amount: 1000, spent: 999 }] });
    expect(plan.budget[0].spent).toBe(0);
  });

  it('drops checklist due dates that are not real dates', () => {
    const plan = sanitizePlan({ checklist: [{ task: 'Book venue', dueDate: 'next tuesday-ish' }] });
    expect(plan.checklist[0].dueDate).toBeUndefined();
  });
});
