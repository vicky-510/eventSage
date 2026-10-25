import { jest } from '@jest/globals';

let callCount;
let modelsThatFail;

jest.unstable_mockModule('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel({ model }) {
      return {
        generateContent: async () => {
          callCount.push(model);
          if (modelsThatFail.includes(model)) {
            throw new Error(`${model} is unavailable`);
          }
          return { response: { text: () => JSON.stringify({ budget: [{ category: 'Venue', amount: 1000 }] }) } };
        },
      };
    }
  },
}));

const { generateStructuredPlan, getModelChain, extractJson } = await import('../src/utils/gemini.js');

beforeEach(() => {
  callCount = [];
  modelsThatFail = [];
  process.env.GEMINI_MODEL_CHAIN = 'model-a,model-b,model-c';
  process.env.GEMINI_API_KEY = 'test-key';
});

describe('getModelChain', () => {
  it('parses a comma-separated env var into an ordered list', () => {
    expect(getModelChain()).toEqual(['model-a', 'model-b', 'model-c']);
  });
});

describe('extractJson', () => {
  it('parses raw JSON text', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('extracts JSON from a fenced code block', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe('generateStructuredPlan', () => {
  it('uses the first model in the chain when it succeeds', async () => {
    const { modelUsed } = await generateStructuredPlan('prompt');
    expect(modelUsed).toBe('model-a');
    expect(callCount).toEqual(['model-a']);
  });

  it('falls through to the next model when earlier ones fail', async () => {
    modelsThatFail = ['model-a', 'model-b'];
    const { modelUsed } = await generateStructuredPlan('prompt');
    expect(modelUsed).toBe('model-c');
    expect(callCount).toEqual(['model-a', 'model-b', 'model-c']);
  });

  it('throws a safe public error when every model in the chain fails', async () => {
    modelsThatFail = ['model-a', 'model-b', 'model-c'];
    await expect(generateStructuredPlan('prompt')).rejects.toThrow(
      /failed on all models/
    );
  });
});
