import type { RuleResult } from '../types';
import { splitLeadingEmoji } from './emoji';

export function checkBanned(title: string, phrases: string[]): RuleResult[] {
  if (phrases.length === 0) return [];

  const { rest } = splitLeadingEmoji(title);
  const haystack = rest.toLowerCase();
  const results: RuleResult[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const needle = phrase.toLowerCase().trim();
    if (!needle || seen.has(needle)) continue;
    const re = new RegExp(`\\b${escapeRegex(needle)}\\b`, 'i');
    if (re.test(haystack)) {
      seen.add(needle);
      results.push({
        rule: 'banned_phrase',
        message: `Title contains banned phrase: "${phrase}".`,
      });
    }
  }

  return results;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
