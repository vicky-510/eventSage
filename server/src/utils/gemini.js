import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL_TIMEOUT_MS } from './constants.js';

const DEFAULT_MODEL_CHAIN = ['gemini-3.1-pro', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

let client = null;

/** One shared client per process instead of one per request. */
function getClient() {
  client ??= new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
}

/**
 * Ordered list of models to try, from GEMINI_MODEL_CHAIN (comma-separated),
 * so models can be reordered or swapped without a code change.
 * @returns {string[]}
 */
export function getModelChain() {
  if (process.env.GEMINI_MODEL_CHAIN) {
    return process.env.GEMINI_MODEL_CHAIN.split(',').map((m) => m.trim()).filter(Boolean);
  }
  return DEFAULT_MODEL_CHAIN;
}

/**
 * Parses JSON from a model response, tolerating a ```json fenced block.
 * @param {string} text
 * @throws {SyntaxError} if no valid JSON is present.
 */
export function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

/** Resolves with the model's text, or rejects if it takes longer than `ms`. */
async function callModelWithTimeout(modelName, prompt, ms) {
  const model = getClient().getGenerativeModel({ model: modelName });
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${modelName} timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([model.generateContent(prompt), timeout]);
    return result.response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walks the model chain in order so one model's outage, deprecation, quota
 * limit or slowness doesn't take down generation. Stops at the first model
 * whose output `parse` accepts.
 * @template T
 * @param {string} prompt
 * @param {(text: string) => T} parse Throws to reject a response and move on.
 * @param {string} failureMessage
 * @returns {Promise<{ data: T, modelUsed: string }>}
 */
async function walkModelChain(prompt, parse, failureMessage) {
  const chain = getModelChain();
  const errors = [];

  for (const modelName of chain) {
    try {
      const text = await callModelWithTimeout(modelName, prompt, GEMINI_MODEL_TIMEOUT_MS);
      return { data: parse(text), modelUsed: modelName };
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
export function generateStructuredPlan(prompt) {
  return walkModelChain(prompt, extractJson, 'AI plan generation failed on all models');
}

/** For free-form conversational replies (chat assistant). */
export function generateText(prompt) {
  return walkModelChain(prompt, (text) => text.trim(), 'AI text generation failed on all models');
}
