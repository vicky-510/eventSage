import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL_CHAIN = ['gemini-3.1-pro', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

export function getModelChain() {
  if (process.env.GEMINI_MODEL_CHAIN) {
    return process.env.GEMINI_MODEL_CHAIN.split(',').map((m) => m.trim()).filter(Boolean);
  }
  // Back-compat with the older two-var config, if someone still sets those instead.
  if (process.env.GEMINI_PRIMARY_MODEL || process.env.GEMINI_FALLBACK_MODEL) {
    return [process.env.GEMINI_PRIMARY_MODEL, process.env.GEMINI_FALLBACK_MODEL].filter(Boolean);
  }
  return DEFAULT_MODEL_CHAIN;
}

export function extractJson(text) {
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
 * Walks a chain of Gemini models in order (configurable via GEMINI_MODEL_CHAIN,
 * a comma-separated list) so a single model's outage, deprecation, or quota
 * limit doesn't take down plan generation. Stops at the first model that
 * returns a response that parses as JSON.
 */
export async function generateStructuredPlan(prompt) {
  const chain = getModelChain();
  const errors = [];

  for (const modelName of chain) {
    try {
      const data = await callModel(modelName, prompt);
      return { data, modelUsed: modelName };
    } catch (err) {
      errors.push({ model: modelName, message: err.message });
    }
  }

  const err = new Error(`AI plan generation failed on all models: ${chain.join(', ')}`);
  err.status = 502;
  err.publicMessage = 'Could not generate plan right now, please try again shortly';
  err.cause = errors;
  throw err;
}
