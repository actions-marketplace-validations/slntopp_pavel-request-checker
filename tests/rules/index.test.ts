import { describe, expect, it } from 'vitest';
import { runRules } from '../../src/rules';
import { DEFAULT_CONFIG } from '../../src/defaults';
import type { Config } from '../../src/types';

function configWith(overrides: (c: Config) => void): Config {
  const c = structuredClone(DEFAULT_CONFIG);
  overrides(c);
  return c;
}

describe('runRules format: all (default)', () => {
  it('emoji+conventional both required, both passing', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
    });
    expect(runRules('✨ feat: add user pagination endpoint', c)).toEqual([]);
  });

  it('fails when only emoji matches in all-mode (conventional missing)', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
    });
    const out = runRules('✨ add user pagination endpoint', c);
    expect(out.some((r) => r.rule === 'conventional')).toBe(true);
  });

  it('fails when only conventional matches in all-mode (emoji missing)', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
    });
    const out = runRules('feat: add user pagination endpoint', c);
    expect(out.some((r) => r.rule === 'emoji_missing')).toBe(true);
  });
});

describe('runRules format: any', () => {
  it('passes when only emoji matches', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
      c.rules.format = 'any';
    });
    expect(runRules('✨ add user pagination endpoint', c)).toEqual([]);
  });

  it('passes when only conventional matches', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
      c.rules.format = 'any';
    });
    expect(runRules('feat: add user pagination endpoint', c)).toEqual([]);
  });

  it('passes when both match', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
      c.rules.format = 'any';
    });
    expect(runRules('✨ feat: add user pagination endpoint', c)).toEqual([]);
  });

  it('fails with a combined message when neither matches', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
      c.rules.format = 'any';
    });
    const out = runRules('add user pagination endpoint', c);
    const fmt = out.find((r) => r.rule === 'format');
    expect(fmt).toBeDefined();
    expect(fmt!.message).toContain('Emoji prefix');
    expect(fmt!.message).toContain('Conventional Commits');
  });

  it('still applies length and banned_phrases independently', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = true;
      c.rules.format = 'any';
    });
    const out = runRules('✨ wip', c);
    expect(out.some((r) => r.rule === 'too_short')).toBe(true);
    expect(out.some((r) => r.rule === 'banned_phrase')).toBe(true);
  });

  it('falls back to all-mode behavior when only emoji is enabled', () => {
    const c = configWith((c) => {
      c.rules.conventional.enabled = false;
      c.rules.format = 'any';
    });
    const out = runRules('add user pagination endpoint', c);
    expect(out.some((r) => r.rule === 'emoji_missing')).toBe(true);
  });

  it('falls back to all-mode behavior when only conventional is enabled', () => {
    const c = configWith((c) => {
      c.rules.emoji.enabled = false;
      c.rules.conventional.enabled = true;
      c.rules.format = 'any';
    });
    const out = runRules('add user pagination endpoint', c);
    expect(out.some((r) => r.rule === 'conventional')).toBe(true);
  });
});
