import { GoogleGenAI } from '@google/genai';

let cachedClient = null;
let cachedApiKey = null;

// In-memory cooldown tracker so overloaded (503), quota-capped (429), or removed (404) models
// are skipped cleanly instead of adding latency on every request.
const modelCooldownUntil = new Map();

export function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

const THINKING_BUDGET_ZERO_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
]);

function uniqueModels(list) {
  return [...new Set(list.filter((m) => typeof m === 'string' && m.trim().length > 0))];
}

function getSmartModelCascade() {
  return uniqueModels([
    process.env.GEMINI_PRIMARY_MODEL,
    'gemini-4-hydrogen',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
  ]);
}

function getFastModelCascade() {
  return uniqueModels([
    process.env.GEMINI_FAST_MODEL,
    'gemini-3.5-flash-lite',
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ]);
}

function recordModelFailure(model, err) {
  const msg = String(err?.message || err || '');
  const now = Date.now();
  if (/404|NOT_FOUND|no longer available/i.test(msg)) {
    modelCooldownUntil.set(model, now + 24 * 60 * 60 * 1000);
  } else if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    modelCooldownUntil.set(model, now + 10 * 60 * 1000);
  } else if (/503|UNAVAILABLE|high demand|TIMEOUT/i.test(msg)) {
    modelCooldownUntil.set(model, now + 2 * 60 * 1000);
  }
}

function isOnCooldown(model) {
  const until = modelCooldownUntil.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    modelCooldownUntil.delete(model);
    return false;
  }
  return true;
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`TIMEOUT_${ms}ms_${label}`)), ms);
    }),
  ]);
}

/**
 * Call Gemini with resilient multi-model fallback, cooldown skipping, and per-call timeout.
 */
export async function generateWithFallback({
  contents,
  systemInstruction = null,
  temperature = 0.2,
  responseMimeType = null,
  maxOutputTokens = 1024,
  preferFast = false,
  timeoutMs = null,
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const cascade = preferFast ? getFastModelCascade() : getSmartModelCascade();
  const activeModels = cascade.filter((m) => !isOnCooldown(m));
  // Always keep a fallback list even if every model recently cooled down
  const candidates = activeModels.length > 0 ? activeModels : cascade;
  const perAttemptMs = timeoutMs || (preferFast ? 7000 : 8500);

  let lastError = null;

  for (const model of candidates) {
    const config = {
      temperature,
      maxOutputTokens,
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }
    if (THINKING_BUDGET_ZERO_MODELS.has(model)) {
      config.thinkingConfig = { thinkingBudget: 0 };
    }

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config,
        }),
        perAttemptMs,
        model
      );

      const text = typeof response?.text === 'string' ? response.text.trim() : '';
      if (!text) {
        throw new Error(`Empty response from ${model}`);
      }

      return { text, model };
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err || '');

      // Retry once without thinkingConfig if a model rejects the parameter
      if (config.thinkingConfig && /thinkingConfig|thinkingBudget/i.test(msg)) {
        try {
          const retryConfig = { ...config };
          delete retryConfig.thinkingConfig;
          const retryRes = await withTimeout(
            ai.models.generateContent({ model, contents, config: retryConfig }),
            perAttemptMs,
            `${model}_retry`
          );
          const retryText = typeof retryRes?.text === 'string' ? retryRes.text.trim() : '';
          if (retryText) return { text: retryText, model };
        } catch (retryErr) {
          lastError = retryErr;
        }
      }

      recordModelFailure(model, lastError);
      console.warn(`[Gemini] ${model} failed (${msg.slice(0, 120)}), trying next model...`);
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

/**
 * Clean AI prose: remove em/en dashes and normalize excessive blank lines.
 */
export function sanitizeAiText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\s*[—–]\s*/g, ' - ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract and parse strict JSON even if wrapped in code fences or stray prose.
 */
export function parseStrictJson(rawText) {
  if (typeof rawText !== 'string') {
    throw new Error('Expected JSON string from AI.');
  }
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstObj = cleaned.indexOf('{');
    const lastObj = cleaned.lastIndexOf('}');
    const firstArr = cleaned.indexOf('[');
    const lastArr = cleaned.lastIndexOf(']');

    const useArray =
      firstArr !== -1 && lastArr > firstArr && (firstObj === -1 || firstArr < firstObj);

    if (useArray) {
      return JSON.parse(cleaned.slice(firstArr, lastArr + 1));
    }
    if (firstObj !== -1 && lastObj > firstObj) {
      return JSON.parse(cleaned.slice(firstObj, lastObj + 1));
    }
    throw new Error('Could not parse valid JSON from AI response.');
  }
}
