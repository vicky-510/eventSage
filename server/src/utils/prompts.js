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
  "ideas": [string],
  "moodboard": {
    "themeName": string,
    "colors": [string, string, string, string],
    "description": string
  },
  "insights": [{ "severity": "info" | "warning" | "critical", "message": string }]
}

Rules:
- Budget category amounts must sum to approximately the total budget.
- Timeline should reflect a realistic run of the event or lead-up days for a wedding.
- Checklist due dates must be calculated backward from the event date (e.g. book venue 60+ days ahead).
- Keep ideas concise and specific to the stated vibe/occasion, 4-6 items.
- Currency should match the budget's implied currency (assume INR if unspecified) but only output numbers, no currency symbols.
- "moodboard.colors" must be 4 valid hex color codes (e.g. "#8B5E34") that fit the stated vibe/occasion.
- "moodboard.description" is one or two sentences describing the visual theme.
- "insights" should flag anything a planner would actually worry about: a category that looks too low/high for the guest count, a tight timeline, a budget that doesn't cover an obviously needed category. 2-4 items, ordered most severe first. If nothing stands out, return an empty array.`;
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

export function buildIntakePrompt(messages) {
  const transcript = messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

  return `You are a friendly event-planning intake assistant for EventSage. Your job is to gather enough
information to start planning a wedding, birthday, or community event, by asking ONE short follow-up
question at a time. You need: a title/occasion, occasion type, date, location, guest count, total budget,
and a vibe/notes description. Don't ask about fields already answered in the conversation below. It's fine
to infer a reasonable title from the occasion and who it's for.

Conversation so far:
${transcript || '(nothing yet — greet the user and ask what they are planning)'}

Respond with ONLY valid JSON (no markdown, no commentary) in exactly one of these two shapes:

If you still need more information, ask the single most useful next question:
{ "done": false, "reply": string }

If you now have enough information to start planning, respond with the structured brief instead:
{
  "done": true,
  "reply": string (a short friendly confirmation message),
  "brief": {
    "title": string,
    "occasionType": "wedding" | "birthday" | "community" | "other",
    "date": "YYYY-MM-DD" | null,
    "location": string,
    "guestCount": number | null,
    "budgetTotal": number | null,
    "vibe": string
  }
}`;
}

export function buildAssistantChatPrompt(event, history, message) {
  const transcript = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  const planSummary = event.plan?.budget?.length
    ? `Budget: ${JSON.stringify(event.plan.budget)}\nTimeline: ${JSON.stringify(event.plan.timeline)}\nChecklist: ${JSON.stringify(event.plan.checklist)}`
    : 'No AI plan has been generated for this event yet.';

  return `You are EventSage's planning assistant, helping the organizer of this event:

Title: ${event.title}
Occasion: ${event.occasionType || 'unspecified'}
Date: ${event.date || 'unspecified'}
Location: ${event.location || 'unspecified'}
Guest count: ${event.guestCount || 'unspecified'}
Total budget: ${event.budgetTotal || 'unspecified'}
Vibe: ${event.vibe || 'unspecified'}

${planSummary}

Conversation so far:
${transcript || '(no previous messages)'}

User: ${message}

Reply helpfully and concisely (a few sentences, plain text, no markdown headers) as the Assistant, using
the event's details above when relevant. Do not invent budget numbers that contradict the data given.`;
}
