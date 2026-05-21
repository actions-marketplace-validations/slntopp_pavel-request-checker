import type { ConventionalRuleConfig, EmojiRuleConfig, RuleResult } from '../types';
import { splitLeadingEmoji } from './emoji';

const CONVENTIONAL_RE = /^([a-z][a-z0-9_-]*)(?:\(([^)]+)\))?(!)?:\s+\S.*$/;

export function checkConventional(
  title: string,
  config: ConventionalRuleConfig,
  emojiConfig: EmojiRuleConfig,
): RuleResult[] {
  if (!config.enabled) return [];

  const subject = emojiConfig.enabled ? splitLeadingEmoji(title).rest : title;

  const match = subject.match(CONVENTIONAL_RE);
  const allowedTypes = new Set<string>([
    ...Object.values(emojiConfig.allowed),
    ...(config.extra_types ?? []),
  ]);

  if (!match) {
    return [
      {
        rule: 'conventional',
        message: `Title does not match Conventional Commits format (type(scope)?: description).`,
      },
    ];
  }

  const type = match[1];
  if (allowedTypes.size > 0 && !allowedTypes.has(type)) {
    return [
      {
        rule: 'conventional',
        message: `Type "${type}" is not allowed. Allowed: ${[...allowedTypes].join(', ')}.`,
      },
    ];
  }

  return [];
}
