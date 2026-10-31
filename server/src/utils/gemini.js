import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL_TIMEOUT_MS } from './constants.js';

const DEFAULT_MODEL_CHAIN = ['gemini-3.1-pro', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

// Built once at module load rather than per-call — the client itself is
// stateless configuration, there's no reason to re-construct it on every request.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

function timeout(ms, modelName) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${modelName} timed out after ${ms}ms`)), ms)
  );
}

async function callModelRaw(modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await Promise.race([model.generateContent(prompt), timeout(GEMINI_MODEL_TIMEOUT_MS, modelName)]);
  return result.response.text();
}

/**
 * Walks a chain of Gemini models in order (configurable via GEMINI_MODEL_CHAIN,
 * a comma-separated list) so a single model's outage, deprecation, or quota
 * limit doesn't take down generation. Stops at the first model whose output
 * is accepted by `parse`.
 */
async function walkModelChain(prompt, parse, failureMessage) {
  const chain = getModelChain();
  const errors = [];

  for (const modelName of chain) {
    try {
      const text = await callModelRaw(modelName, prompt);
      const data = parse(text);
      return { data, modelUsed: modelName };
    } catch (err) {
      errors.push({ model: modelName, message: err.message });
    }
  }

  const err = new Error(`${failureMessage}: ${chain.join(', ')}`);
  err.status = 502;
  err.publicMessage = 'AI is unavailable right now, please try again shortly';
  err.cause = errors;
  throw err;
}

/** For prompts that must return a strict JSON object. */
export async function generateStructuredPlan(prompt) {
  return walkModelChain(prompt, extractJson, 'AI plan generation failed on all models');
}

/** For free-form conversational replies (chat assistant, intake). */
export async function generateText(prompt) {
  return walkModelChain(prompt, (text) => text.trim(), 'AI text generation failed on all models');
}
