import { describe, expect, it } from 'vitest';
import { checkBanned } from '../../src/rules/banned';

const phrases = ['dev fixes', 'wip', 'misc updates', 'stuff'];

describe('checkBanned', () => {
  it('matches a banned phrase case-insensitively', () => {
    const out = checkBanned('🐛 Dev Fixes for login', phrases);
    expect(out).toHaveLength(1);
    expect(out[0].rule).toBe('banned_phrase');
    expect(out[0].message).toContain('dev fixes');
  });

  it('does not match a partial word', () => {
    expect(checkBanned('🔧 wiped the cache thoroughly', phrases)).toEqual([]);
  });

  it('matches whole-word "wip"', () => {
    expect(checkBanned('🔧 wip changes today are big', phrases)).toHaveLength(1);
  });

  it('returns empty when no phrases configured', () => {
    expect(checkBanned('anything goes here', [])).toEqual([]);
  });

  it('reports each distinct banned phrase once', () => {
    const out = checkBanned('🔧 misc updates and wip', phrases);
    const matched = out.map((r) => r.message);
    expect(matched.some((m) => m.includes('misc updates'))).toBe(true);
    expect(matched.some((m) => m.includes('wip'))).toBe(true);
  });

  it('strips the emoji prefix before matching', () => {
    expect(checkBanned('✨ Dev Fixes today', phrases)).toHaveLength(1);
  });

  it('reports the canonical phrase, not the title casing', () => {
    const out = checkBanned('🔧 STUFF happened', phrases);
    expect(out[0].message).toContain('"stuff"');
  });
});
