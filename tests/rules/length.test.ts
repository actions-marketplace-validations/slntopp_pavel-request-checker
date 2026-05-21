import { describe, expect, it } from 'vitest';
import { checkLength } from '../../src/rules/length';
import type { LengthRuleConfig } from '../../src/types';

const config: LengthRuleConfig = { min_words: 4, max_chars: 72 };

describe('checkLength', () => {
  it('passes for a normal title', () => {
    expect(checkLength('✨ add pagination to users API', config)).toEqual([]);
  });

  it('fails when too few words (after emoji)', () => {
    const out = checkLength('🐛 fix bug', config);
    expect(out.some((r) => r.rule === 'too_short')).toBe(true);
  });

  it('fails when too long', () => {
    const long = '✨ ' + 'word '.repeat(40);
    const out = checkLength(long.trim(), config);
    expect(out.some((r) => r.rule === 'too_long')).toBe(true);
  });

  it('fails on empty title', () => {
    expect(checkLength('', config).some((r) => r.rule === 'too_short')).toBe(true);
  });

  it('fails on emoji-only title', () => {
    expect(checkLength('✨', config).some((r) => r.rule === 'too_short')).toBe(true);
  });

  it('counts trailing punctuation correctly', () => {
    expect(checkLength('✨ one, two, three, four!', config)).toEqual([]);
  });
});
