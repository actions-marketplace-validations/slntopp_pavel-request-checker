import { describe, expect, it, vi } from 'vitest';
import { evaluateWithGemini, GeminiError } from '../../src/ai/gemini';

const MODEL = 'gemini-3.1-flash-lite';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function geminiBody(verdict: { pass: boolean; reason: string; suggestion: string }) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(verdict) }],
        },
      },
    ],
  };
}

describe('evaluateWithGemini', () => {
  it('parses a passing verdict', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(200, geminiBody({ pass: true, reason: 'looks good', suggestion: '' })));

    const verdict = await evaluateWithGemini({
      apiKey: 'fake',
      model: MODEL,
      title: '✨ add OAuth flow to login',
      fetchImpl,
    });
    expect(verdict).toEqual({ pass: true, reason: 'looks good', suggestion: '' });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain('/v1beta/models/');
    expect(url).toContain(MODEL);
  });

  it('parses a failing verdict with suggestion', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse(200, geminiBody({ pass: false, reason: 'too vague', suggestion: '🐛 fix login retry' })),
      );

    const verdict = await evaluateWithGemini({
      apiKey: 'fake',
      model: MODEL,
      title: '🐛 fix some stuff',
      fetchImpl,
    });
    expect(verdict.pass).toBe(false);
    expect(verdict.suggestion).toBe('🐛 fix login retry');
  });

  it('retries once on a 5xx error', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(503, 'service unavailable'))
      .mockResolvedValueOnce(jsonResponse(200, geminiBody({ pass: true, reason: 'ok', suggestion: '' })));

    const verdict = await evaluateWithGemini({
      apiKey: 'fake',
      model: MODEL,
      title: '✨ add OAuth flow to login',
      fetchImpl,
    });
    expect(verdict.pass).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws after persistent 5xx errors', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(503, 'down'));

    await expect(
      evaluateWithGemini({ apiKey: 'fake', model: MODEL, title: '✨ add OAuth', fetchImpl }),
    ).rejects.toBeInstanceOf(GeminiError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a 4xx error', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(429, 'rate limited'));

    await expect(
      evaluateWithGemini({ apiKey: 'fake', model: MODEL, title: '✨ add OAuth', fetchImpl }),
    ).rejects.toBeInstanceOf(GeminiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws when response payload is not valid JSON', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse(200, { candidates: [{ content: { parts: [{ text: 'not json' }] } }] }),
      );

    await expect(
      evaluateWithGemini({ apiKey: 'fake', model: MODEL, title: '✨ add OAuth', fetchImpl }),
    ).rejects.toBeInstanceOf(GeminiError);
  });

  it('retries once on a network error', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce(jsonResponse(200, geminiBody({ pass: true, reason: 'ok', suggestion: '' })));

    const verdict = await evaluateWithGemini({
      apiKey: 'fake',
      model: MODEL,
      title: '✨ add OAuth',
      fetchImpl,
    });
    expect(verdict.pass).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
