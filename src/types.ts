export interface EmojiRuleConfig {
  enabled: boolean;
  required: boolean;
  allowed: Record<string, string>;
}

export interface LengthRuleConfig {
  min_words: number;
  max_chars: number;
}

export interface ConventionalRuleConfig {
  enabled: boolean;
  extra_types?: string[];
}

export interface RulesConfig {
  emoji: EmojiRuleConfig;
  length: LengthRuleConfig;
  banned_phrases: string[];
  conventional: ConventionalRuleConfig;
  format: 'all' | 'any';
}

export interface AiConfig {
  enabled: boolean;
  model: string;
  guidance?: string;
}

export interface Config {
  rules: RulesConfig;
  ai: AiConfig;
}

export type RuleId =
  | 'emoji_missing'
  | 'emoji_unknown'
  | 'too_short'
  | 'too_long'
  | 'banned_phrase'
  | 'conventional'
  | 'format';

export interface RuleResult {
  rule: RuleId;
  message: string;
}

export interface AiVerdict {
  pass: boolean;
  reason: string;
  suggestion: string;
}

export interface AiOutcome {
  status: 'ok' | 'skipped' | 'error';
  verdict?: AiVerdict;
  errorReason?: string;
}
