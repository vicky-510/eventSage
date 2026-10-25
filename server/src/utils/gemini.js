import { GoogleGenerativeAI } from '@google/generative-ai';

const PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.1-pro';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash';

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

async function callModel(modelName, prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return extractJson(text);
}

/**
 * Tries the primary Gemini model; on any failure (error, timeout, malformed
 * JSON) falls back to the secondary model so a single model outage/deprecation
 * doesn't take down plan generation.
 */
export async function generateStructuredPlan(prompt) {
  try {
    return { data: await callModel(PRIMARY_MODEL, prompt), modelUsed: PRIMARY_MODEL };
  } catch (primaryErr) {
    try {
      return { data: await callModel(FALLBACK_MODEL, prompt), modelUsed: FALLBACK_MODEL };
    } catch (fallbackErr) {
      const err = new Error('AI plan generation failed on both primary and fallback models');
      err.status = 502;
      err.publicMessage = 'Could not generate plan right now, please try again shortly';
      err.cause = { primaryErr, fallbackErr };
      throw err;
    }
  }
}
