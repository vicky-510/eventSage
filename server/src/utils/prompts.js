export function buildPlanPrompt(event) {
  return `You are an expert event planner. Based on the event brief below, generate a complete plan.

Event brief:
- Title: ${event.title}
- Occasion type: ${event.occasionType || 'not specified'}
- Date: ${event.date || 'not specified'}
- Location: ${event.location || 'not specified'}
- Guest count: ${event.guestCount || 'not specified'}
- Total budget: ${event.budgetTotal || 'not specified'}
- Vibe/notes: ${event.vibe || 'none'}

Respond with ONLY valid JSON (no markdown, no commentary) matching exactly this shape:
{
  "budget": [{ "category": string, "amount": number }],
  "timeline": [{ "label": string, "time": string, "notes": string }],
  "checklist": [{ "task": string, "dueDate": "YYYY-MM-DD", "status": "todo" }],
  "ideas": [string]
}

Rules:
- Budget category amounts must sum to approximately the total budget.
- Timeline should reflect a realistic run of the event or lead-up days for a wedding.
- Checklist due dates must be calculated backward from the event date (e.g. book venue 60+ days ahead).
- Keep ideas concise and specific to the stated vibe/occasion, 4-6 items.
- Currency should match the budget's implied currency (assume INR if unspecified) but only output numbers, no currency symbols.`;
}

export function buildReplanPrompt(event, changeDescription) {
  return `You are re-optimizing an existing event budget given a change.

Current budget (JSON): ${JSON.stringify(event.plan.budget)}
Total budget: ${event.budgetTotal}
Change described by the user: "${changeDescription}"

Re-allocate the remaining budget across categories to account for this change, keeping the total at or under the original total budget where possible.

Respond with ONLY valid JSON (no markdown, no commentary) matching exactly:
{ "budget": [{ "category": string, "amount": number }] }`;
}
