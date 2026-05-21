import { describe, expect, it } from 'vitest';
import { checkEmoji, splitLeadingEmoji } from '../../src/rules/emoji';
import type { EmojiRuleConfig } from '../../src/types';

const baseConfig: EmojiRuleConfig = {
  enabled: true,
  required: true,
  allowed: {
    '✨': 'feat',
    '🐛': 'fix',
    '♻️': 'refactor',
  },
};

describe('splitLeadingEmoji', () => {
  it('extracts a single-codepoint emoji', () => {
    expect(splitLeadingEmoji('✨ add feature')).toEqual({ emoji: '✨', rest: 'add feature' });
  });

  it('extracts a multi-codepoint emoji (recycle with variation selector)', () => {
    expect(splitLeadingEmoji('♻️ refactor things')).toEqual({
      emoji: '♻️',
      rest: 'refactor things',
    });
  });

  it('returns null emoji when title starts with a letter', () => {
    expect(splitLeadingEmoji('add feature')).toEqual({ emoji: null, rest: 'add feature' });
  });

  it('handles empty string', () => {
    expect(splitLeadingEmoji('')).toEqual({ emoji: null, rest: '' });
  });
});

describe('checkEmoji', () => {
  it('passes when title starts with allowed emoji + space', () => {
    expect(checkEmoji('✨ add new login flow', baseConfig)).toEqual([]);
  });

  it('fails when emoji prefix missing and required', () => {
    const out = checkEmoji('add login flow', baseConfig);
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe('emoji_missing');
  });

  it('does not fail on missing emoji when not required', () => {
    expect(
      checkEmoji('add login flow', { ...baseConfig, required: false }),
    ).toEqual([]);
  });

  it('fails on unknown emoji', () => {
    const out = checkEmoji('🎉 add login flow', baseConfig);
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe('emoji_unknown');
  });

  it('fails when emoji not followed by a space', () => {
    const out = checkEmoji('✨add login', baseConfig);
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe('emoji_missing');
  });

  it('skipped entirely when disabled', () => {
    expect(checkEmoji('anything goes', { ...baseConfig, enabled: false })).toEqual([]);
  });
});
