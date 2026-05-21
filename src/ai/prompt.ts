export const SYSTEM_INSTRUCTION = `You are reviewing a pull request title for clarity and informativeness. A good
title tells a reader what changed without needing to open the PR. A bad title is
vague, generic, or describes the act of changing rather than what changed.

Examples of bad titles:
- "fix bugs"
- "update code"
- "improvements"
- "various changes"
- "address feedback"
- "dev fixes"

Examples of good titles:
- "fix race condition in payment webhook retry"
- "add pagination to /users API"
- "remove deprecated v1 auth middleware"

Note: the title may begin with an emoji prefix — ignore the emoji when judging
the description.

Respond with JSON matching the provided schema. If the title is acceptable, set
pass=true and put a brief positive note in reason. If not, set pass=false,
explain what's vague or missing in reason, and provide a concrete rewritten
title in suggestion (you may invent plausible specifics if you don't know them
— the suggestion is illustrative).`;

export function buildSystemInstruction(guidance?: string): string {
  if (!guidance || !guidance.trim()) return SYSTEM_INSTRUCTION;
  return `${SYSTEM_INSTRUCTION}\n\nAdditional project guidance:\n${guidance.trim()}`;
}

export function buildUserMessage(title: string): string {
  return `PR title: "${title}"`;
}
