import type { EmojiRuleConfig, RuleResult } from '../types';

export interface EmojiSplit {
  emoji: string | null;
  rest: string;
}

export function splitLeadingEmoji(title: string): EmojiSplit {
  if (!title) return { emoji: null, rest: '' };
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const iter = segmenter.segment(title)[Symbol.iterator]();
  const first = iter.next();
  if (first.done) return { emoji: null, rest: '' };
  const grapheme = first.value.segment;
  if (!isEmojiGrapheme(grapheme)) {
    return { emoji: null, rest: title };
  }
  const rest = title.slice(grapheme.length).replace(/^\s+/, '');
  return { emoji: grapheme, rest };
}

function isEmojiGrapheme(grapheme: string): boolean {
  for (const ch of grapheme) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp >= 0x2000 && cp <= 0x3300) return true;
    if (cp >= 0x1f000 && cp <= 0x1ffff) return true;
    if (cp >= 0x2600 && cp <= 0x27bf) return true;
  }
  return false;
}

export function checkEmoji(title: string, config: EmojiRuleConfig): RuleResult[] {
  if (!config.enabled) return [];

  const { emoji, rest } = splitLeadingEmoji(title);
  const allowedList = describeAllowed(config.allowed);

  if (!emoji) {
    if (config.required) {
      return [
        {
          rule: 'emoji_missing',
          message: `Missing required emoji prefix. Allowed: ${allowedList}.`,
        },
      ];
    }
    return [];
  }

  if (!(emoji in config.allowed)) {
    return [
      {
        rule: 'emoji_unknown',
        message: `Emoji "${emoji}" is not in the allowed set. Allowed: ${allowedList}.`,
      },
    ];
  }

  if (title.length > emoji.length && title[emoji.length] !== ' ') {
    return [
      {
        rule: 'emoji_missing',
        message: `Emoji must be followed by a single space before the description.`,
      },
    ];
  }

  if (rest.length === 0) {
    // Length rule will catch this; emoji rule itself is satisfied structurally.
    return [];
  }

  return [];
}

function describeAllowed(allowed: Record<string, string>): string {
  const entries = Object.entries(allowed);
  if (entries.length === 0) return '(none configured)';
  return entries.map(([k, v]) => `${k} (${v})`).join(', ');
}
