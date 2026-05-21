import type { Config, RuleResult } from '../types';
import { checkEmoji } from './emoji';
import { checkLength } from './length';
import { checkBanned } from './banned';
import { checkConventional } from './conventional';

export function runRules(title: string, config: Config): RuleResult[] {
  const failures: RuleResult[] = [];
  failures.push(...checkEmoji(title, config.rules.emoji));
  failures.push(...checkLength(title, config.rules.length));
  failures.push(...checkBanned(title, config.rules.banned_phrases));
  failures.push(...checkConventional(title, config.rules.conventional, config.rules.emoji));
  return failures;
}
