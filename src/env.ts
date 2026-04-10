import { DatapackError } from './errors';
import type { SchemaShape, InferShape, Prettify } from './types';

/**
 * Parse environment variables through a schema.
 * Reads from `process.env` (Node.js) or a provided record.
 *
 * Usage:
 * ```ts
 * const config = dp.env({
 *   PORT: dp.number().default(3000),
 *   DB_URL: dp.string(),
 *   DEBUG: dp.boolean().default(false),
 * });
 * config.PORT // number
 * ```
 */
export function parseEnv<S extends SchemaShape>(
  shape: S,
  source?: Record<string, string | undefined>,
): Prettify<InferShape<S>> {
  const env = source ?? getProcessEnv();
  const issues: import('./errors').ValidationIssue[] = [];
  const result: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(shape)) {
    const raw = env[key];
    const parsed = field._parse(raw, [key]);
    if (parsed.issues.length > 0) {
      issues.push(...parsed.issues);
    } else if (parsed.value !== undefined) {
      result[key] = parsed.value;
    }
  }

  if (issues.length > 0) {
    throw new DatapackError(issues);
  }

  return result as Prettify<InferShape<S>>;
}

function getProcessEnv(): Record<string, string | undefined> {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as Record<string, string | undefined>;
  }
  return {};
}
