import { describe, expect, it } from 'vitest';
import {
  collectReasons,
  isPassing,
  renderFailure,
  renderSuccess,
} from '../src/render';
import { STICKY_MARKER } from '../src/github/comment';

describe('render', () => {
  it('isPassing true when no rule failures and AI passed', () => {
    expect(
      isPassing({
        title: '✨ add OAuth',
        ruleFailures: [],
        ai: { status: 'ok', verdict: { pass: true, reason: 'good', suggestion: '' } },
      }),
    ).toBe(true);
  });

  it('isPassing true on AI error (fail-open) with no rule failures', () => {
    expect(
      isPassing({
        title: '✨ add OAuth',
        ruleFailures: [],
        ai: { status: 'error', errorReason: 'timeout' },
      }),
    ).toBe(true);
  });

  it('isPassing false when rule failures exist', () => {
    expect(
      isPassing({
        title: 'bad',
        ruleFailures: [{ rule: 'too_short', message: 'too short' }],
        ai: { status: 'skipped' },
      }),
    ).toBe(false);
  });

  it('renderSuccess includes marker and title', () => {
    const out = renderSuccess('✨ add OAuth flow', { status: 'skipped' });
    expect(out).toContain(STICKY_MARKER);
    expect(out).toContain('✨ add OAuth flow');
    expect(out).toContain('PR title looks good');
  });

  it('renderFailure lists each rule message and AI suggestion', () => {
    const out = renderFailure({
      title: 'wip',
      ruleFailures: [
        { rule: 'too_short', message: 'too short' },
        { rule: 'banned_phrase', message: 'banned: wip' },
      ],
      ai: {
        status: 'ok',
        verdict: { pass: false, reason: 'too vague', suggestion: '🐛 fix retry loop' },
      },
    });
    expect(out).toContain(STICKY_MARKER);
    expect(out).toContain('too short');
    expect(out).toContain('banned: wip');
    expect(out).toContain('too vague');
    expect(out).toContain('🐛 fix retry loop');
  });

  it('renderFailure notes AI fail-open', () => {
    const out = renderFailure({
      title: 'wip',
      ruleFailures: [{ rule: 'too_short', message: 'too short' }],
      ai: { status: 'error', errorReason: 'timeout' },
    });
    expect(out).toContain('AI semantic check skipped');
  });

  it('collectReasons gathers rule and AI reasons', () => {
    const reasons = collectReasons({
      title: 'wip',
      ruleFailures: [{ rule: 'too_short', message: 'too short' }],
      ai: { status: 'ok', verdict: { pass: false, reason: 'too vague', suggestion: '' } },
    });
    expect(reasons).toEqual(['too short', 'AI: too vague']);
  });
});
