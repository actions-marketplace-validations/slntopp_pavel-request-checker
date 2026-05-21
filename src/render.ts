import { STICKY_MARKER } from './github/comment';
import type { AiOutcome, RuleResult } from './types';

export interface RenderInput {
  title: string;
  ruleFailures: RuleResult[];
  ai: AiOutcome;
}

export function isPassing(input: RenderInput): boolean {
  if (input.ruleFailures.length > 0) return false;
  if (input.ai.status === 'ok' && input.ai.verdict && !input.ai.verdict.pass) return false;
  return true;
}

export function collectReasons(input: RenderInput): string[] {
  const reasons: string[] = input.ruleFailures.map((r) => r.message);
  if (input.ai.status === 'ok' && input.ai.verdict && !input.ai.verdict.pass) {
    reasons.push(`AI: ${input.ai.verdict.reason}`);
  }
  return reasons;
}

export function renderSuccess(title: string, ai: AiOutcome): string {
  const lines = [STICKY_MARKER, '### ✅ PR title looks good', '', `\`${title}\``];
  if (ai.status === 'error') {
    lines.push('', `> ⚠️ AI semantic check skipped: ${ai.errorReason}. Structural rules passed.`);
  }
  return lines.join('\n');
}

export function renderFailure(input: RenderInput): string {
  const lines: string[] = [STICKY_MARKER, '### ❌ PR title check failed', ''];
  lines.push(`**Title:** \`${input.title || '(empty)'}\``, '', '**Issues:**');

  for (const r of input.ruleFailures) {
    lines.push(`- ${r.message}`);
  }

  let suggestion: string | undefined;
  if (input.ai.status === 'ok' && input.ai.verdict && !input.ai.verdict.pass) {
    lines.push(`- _AI:_ ${input.ai.verdict.reason}`);
    if (input.ai.verdict.suggestion) {
      suggestion = input.ai.verdict.suggestion;
    }
  }

  if (suggestion) {
    lines.push('', `**Suggestion:** \`${suggestion}\``);
  }

  if (input.ai.status === 'error') {
    lines.push('', `> ⚠️ AI semantic check skipped: ${input.ai.errorReason}.`);
  }

  lines.push('', '<sub>Edit the PR title to re-run this check.</sub>');
  return lines.join('\n');
}
