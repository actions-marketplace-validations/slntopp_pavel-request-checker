import { describe, expect, it } from 'vitest';
import { checkConventional } from '../../src/rules/conventional';
import type { ConventionalRuleConfig, EmojiRuleConfig } from '../../src/types';

const emojiOn: EmojiRuleConfig = {
  enabled: true,
  required: true,
  allowed: { '✨': 'feat', '🐛': 'fix' },
};

describe('checkConventional', () => {
  it('skips when disabled', () => {
    const conf: ConventionalRuleConfig = { enabled: false };
    expect(checkConventional('anything', conf, emojiOn)).toEqual([]);
  });

  it('passes a conventional title after emoji', () => {
    const conf: ConventionalRuleConfig = { enabled: true };
    expect(checkConventional('✨ feat(auth): add OAuth', conf, emojiOn)).toEqual([]);
  });

  it('fails a non-conventional title', () => {
    const conf: ConventionalRuleConfig = { enabled: true };
    const out = checkConventional('✨ add a thing', conf, emojiOn);
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe('conventional');
  });

  it('fails when type is not in allowed set', () => {
    const conf: ConventionalRuleConfig = { enabled: true };
    const out = checkConventional('✨ chore: tweak', conf, emojiOn);
    expect(out).toHaveLength(1);
    expect(out[0].message).toContain('chore');
  });

  it('respects extra_types', () => {
    const conf: ConventionalRuleConfig = { enabled: true, extra_types: ['chore'] };
    expect(checkConventional('✨ chore: tweak whatever', conf, emojiOn)).toEqual([]);
  });
});
