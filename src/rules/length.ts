import type { LengthRuleConfig, RuleResult } from '../types';
import { splitLeadingEmoji } from './emoji';

export function checkLength(title: string, config: LengthRuleConfig): RuleResult[] {
  const results: RuleResult[] = [];
  const { rest } = splitLeadingEmoji(title);
  const words = countWords(rest);

  if (words < config.min_words) {
    results.push({
      rule: 'too_short',
      message: `Title is too short: ${words} word${words === 1 ? '' : 's'} (minimum ${config.min_words}).`,
    });
  }

  if (title.length > config.max_chars) {
    results.push({
      rule: 'too_long',
      message: `Title is too long: ${title.length} characters (maximum ${config.max_chars}).`,
    });
  }

  return results;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed
    .split(/\s+/)
    .map((w) => w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ''))
    .filter((w) => w.length > 0).length;
}
