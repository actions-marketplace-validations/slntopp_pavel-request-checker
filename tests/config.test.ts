import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigError, loadConfig, mergeConfig } from '../src/config';
import { DEFAULT_CONFIG } from '../src/defaults';

function tmpRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pr-title-check-'));
}

describe('loadConfig', () => {
  it('returns defaults when no config file exists', () => {
    const root = tmpRepo();
    const config = loadConfig(root, '.github/pr-title-check.yml');
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('merges partial overrides on top of defaults', () => {
    const root = tmpRepo();
    fs.mkdirSync(path.join(root, '.github'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.github/pr-title-check.yml'),
      'rules:\n  length:\n    min_words: 6\n',
    );
    const config = loadConfig(root, '.github/pr-title-check.yml');
    expect(config.rules.length.min_words).toBe(6);
    expect(config.rules.length.max_chars).toBe(DEFAULT_CONFIG.rules.length.max_chars);
    expect(config.rules.banned_phrases).toEqual(DEFAULT_CONFIG.rules.banned_phrases);
  });

  it('replaces banned_phrases array entirely (not concatenates)', () => {
    const root = tmpRepo();
    fs.mkdirSync(path.join(root, '.github'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.github/pr-title-check.yml'),
      'rules:\n  banned_phrases:\n    - only one\n',
    );
    const config = loadConfig(root, '.github/pr-title-check.yml');
    expect(config.rules.banned_phrases).toEqual(['only one']);
  });

  it('replaces emoji.allowed entirely', () => {
    const root = tmpRepo();
    fs.mkdirSync(path.join(root, '.github'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.github/pr-title-check.yml'),
      'rules:\n  emoji:\n    allowed:\n      "🎨": style\n',
    );
    const config = loadConfig(root, '.github/pr-title-check.yml');
    expect(config.rules.emoji.allowed).toEqual({ '🎨': 'style' });
  });

  it('throws ConfigError on malformed YAML', () => {
    const root = tmpRepo();
    fs.mkdirSync(path.join(root, '.github'), { recursive: true });
    fs.writeFileSync(path.join(root, '.github/pr-title-check.yml'), '::: not yaml :::\n  - [');
    expect(() => loadConfig(root, '.github/pr-title-check.yml')).toThrow(ConfigError);
  });

  it('throws ConfigError on invalid schema', () => {
    const root = tmpRepo();
    fs.mkdirSync(path.join(root, '.github'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.github/pr-title-check.yml'),
      'rules:\n  length:\n    min_words: "not a number"\n',
    );
    expect(() => loadConfig(root, '.github/pr-title-check.yml')).toThrow(ConfigError);
  });
});

describe('mergeConfig', () => {
  it('does not mutate the base config', () => {
    const base = structuredClone(DEFAULT_CONFIG);
    mergeConfig(base, { rules: { length: { min_words: 99 } } });
    expect(base.rules.length.min_words).toBe(DEFAULT_CONFIG.rules.length.min_words);
  });
});
