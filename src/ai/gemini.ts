import type { AiVerdict } from '../types';
import { buildSystemInstruction, buildUserMessage } from './prompt';

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    reason: { type: 'string' },
    suggestion: { type: 'string' },
  },
  required: ['pass', 'reason', 'suggestion'],
};

export interface GeminiOptions {
  apiKey: string;
  model: string;
  title: string;
  guidance?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly retriable: boolean,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callOnce(opts: GeminiOptions): Promise<AiVerdict> {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const url = `${GEMINI_API_BASE}/v1beta/models/${encodeURIComponent(
    opts.model,
  )}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const body = {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction(opts.guidance) }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: buildUserMessage(opts.title) }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const e = err as Error;
    const aborted = e.name === 'AbortError';
    throw new GeminiError(aborted ? 'Gemini request timed out' : `Network error: ${e.message}`, true);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await safeText(res);
    const retriable = res.status >= 500 && res.status < 600;
    throw new GeminiError(
      `Gemini API returned HTTP ${res.status}${text ? `: ${truncate(text, 300)}` : ''}`,
      retriable,
    );
  }

  const payload = (await res.json()) as GeminiResponse;
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError('Gemini response missing content', false);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError('Gemini response was not valid JSON', false);
  }

  return validateVerdict(parsed);
}

export async function evaluateWithGemini(opts: GeminiOptions): Promise<AiVerdict> {
  try {
    return await callOnce(opts);
  } catch (err) {
    if (err instanceof GeminiError && err.retriable) {
      return await callOnce(opts);
    }
    throw err;
  }
}

function validateVerdict(value: unknown): AiVerdict {
  if (!value || typeof value !== 'object') {
    throw new GeminiError('Gemini response is not an object', false);
  }
  const v = value as Record<string, unknown>;
  if (typeof v.pass !== 'boolean') {
    throw new GeminiError('Gemini response missing boolean "pass"', false);
  }
  if (typeof v.reason !== 'string') {
    throw new GeminiError('Gemini response missing string "reason"', false);
  }
  const suggestion = typeof v.suggestion === 'string' ? v.suggestion : '';
  return { pass: v.pass, reason: v.reason, suggestion };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
