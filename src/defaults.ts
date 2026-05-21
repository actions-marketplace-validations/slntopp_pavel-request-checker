import type { Config } from './types';

export const DEFAULT_CONFIG: Config = {
  rules: {
    emoji: {
      enabled: true,
      required: true,
      allowed: {
        '✨': 'feat',
        '🐛': 'fix',
        '📝': 'docs',
        '♻️': 'refactor',
        '🧪': 'test',
        '🔧': 'chore',
        '⚡': 'perf',
        '🚀': 'release',
        '⭐': 'highlight',
        '🧹': 'cleanup',
        '⚙️': 'config',
      },
    },
    length: {
      min_words: 4,
      max_chars: 72,
    },
    banned_phrases: [
      'dev fixes',
      'wip',
      'misc',
      'misc updates',
      'various changes',
      'updates',
      'fixes',
      'stuff',
      'things',
    ],
    conventional: {
      enabled: false,
    },
  },
  ai: {
    enabled: true,
    model: 'gemini-3.1-flash-lite',
    guidance: undefined,
  },
};
