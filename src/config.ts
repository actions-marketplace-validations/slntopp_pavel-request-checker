import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import merge from 'lodash.merge';
import { z } from 'zod';
import { DEFAULT_CONFIG } from './defaults';
import type { Config } from './types';

const EmojiSchema = z.object({
  enabled: z.boolean().optional(),
  required: z.boolean().optional(),
  allowed: z.record(z.string()).optional(),
});

const LengthSchema = z.object({
  min_words: z.number().int().nonnegative().optional(),
  max_chars: z.number().int().positive().optional(),
});

const ConventionalSchema = z.object({
  enabled: z.boolean().optional(),
  extra_types: z.array(z.string()).optional(),
});

const RulesSchema = z.object({
  emoji: EmojiSchema.optional(),
  length: LengthSchema.optional(),
  banned_phrases: z.array(z.string()).optional(),
  conventional: ConventionalSchema.optional(),
});

const AiSchema = z.object({
  enabled: z.boolean().optional(),
  model: z.string().optional(),
  guidance: z.string().optional(),
});

const ConfigSchema = z.object({
  rules: RulesSchema.optional(),
  ai: AiSchema.optional(),
});

export type PartialConfig = z.infer<typeof ConfigSchema>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const ARRAY_PATHS = [
  ['rules', 'banned_phrases'],
  ['rules', 'conventional', 'extra_types'],
] as const;

const REPLACE_OBJECT_PATHS = [['rules', 'emoji', 'allowed']] as const;

export function loadConfig(repoRoot: string, configPath: string): Config {
  const absolute = path.isAbsolute(configPath) ? configPath : path.join(repoRoot, configPath);

  if (!fs.existsSync(absolute)) {
    return structuredClone(DEFAULT_CONFIG);
  }

  let parsed: unknown;
  try {
    const raw = fs.readFileSync(absolute, 'utf8');
    parsed = yaml.load(raw);
  } catch (err) {
    throw new ConfigError(
      `Failed to parse YAML at ${configPath}: ${(err as Error).message}`,
    );
  }

  if (parsed === null || parsed === undefined) {
    return structuredClone(DEFAULT_CONFIG);
  }

  const validated = ConfigSchema.safeParse(parsed);
  if (!validated.success) {
    throw new ConfigError(
      `Invalid config at ${configPath}: ${validated.error.issues
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')}`,
    );
  }

  return mergeConfig(DEFAULT_CONFIG, validated.data);
}

export function mergeConfig(base: Config, override: PartialConfig): Config {
  const result = structuredClone(base);
  merge(result, override);

  const resultAsRecord = result as unknown as Record<string, unknown>;
  for (const segments of ARRAY_PATHS) {
    const overrideValue = getPath(override, segments);
    if (Array.isArray(overrideValue)) {
      setPath(resultAsRecord, segments, [...overrideValue]);
    }
  }

  for (const segments of REPLACE_OBJECT_PATHS) {
    const overrideValue = getPath(override, segments);
    if (overrideValue && typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
      setPath(resultAsRecord, segments, { ...(overrideValue as Record<string, unknown>) });
    }
  }

  return result;
}

function getPath(obj: unknown, segments: readonly string[]): unknown {
  let cur: unknown = obj;
  for (const seg of segments) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function setPath(obj: Record<string, unknown>, segments: readonly string[], value: unknown): void {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (!(seg in cur) || typeof cur[seg] !== 'object' || cur[seg] === null) {
      cur[seg] = {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segments[segments.length - 1]] = value;
}
