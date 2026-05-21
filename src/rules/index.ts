import type { Config, RuleResult } from '../types';
import { checkEmoji } from './emoji';
import { checkLength } from './length';
import { checkBanned } from './banned';
import { checkConventional } from './conventional';

export function runRules(title: string, config: Config): RuleResult[] {
  const failures: RuleResult[] = [];

  const emojiFailures = checkEmoji(title, config.rules.emoji);
  const conventionalFailures = checkConventional(
    title,
    config.rules.conventional,
    config.rules.emoji,
  );

  const bothActive = config.rules.emoji.enabled && config.rules.conventional.enabled;
  if (config.rules.format === 'any' && bothActive) {
    const emojiPassed = emojiFailures.length === 0;
    const conventionalPassed = conventionalFailures.length === 0;
    if (!emojiPassed && !conventionalPassed) {
      failures.push({
        rule: 'format',
        message: buildAnyModeMessage(emojiFailures, conventionalFailures),
      });
    }
  } else {
    failures.push(...emojiFailures, ...conventionalFailures);
  }

  failures.push(...checkLength(title, config.rules.length));
  failures.push(...checkBanned(title, config.rules.banned_phrases));
  return failures;
}

function buildAnyModeMessage(
  emojiFailures: RuleResult[],
  conventionalFailures: RuleResult[],
): string {
  const emojiPart = emojiFailures.map((f) => f.message).join(' ');
  const conventionalPart = conventionalFailures.map((f) => f.message).join(' ');
  return (
    'Title must match either format. ' +
    `Emoji prefix: ${emojiPart} ` +
    `Conventional Commits: ${conventionalPart}`
  );
}
