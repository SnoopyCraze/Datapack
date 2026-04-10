import { type ValidationIssue, issue } from '../errors';
import { BaseField } from './base';

export class NumberField extends BaseField<number> {
  readonly _kind = 'number';

  _coerce(value: unknown, path: (string | number)[]): { value: number; issues: ValidationIssue[] } {
    if (typeof value === 'number') {
      if (Number.isNaN(value)) {
        return { value: 0 as any, issues: [issue(path, 'Expected number, got NaN', 'invalid_type')] };
      }
      return { value, issues: [] };
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return { value: parsed, issues: [] };
    }
    return {
      value: 0 as any,
      issues: [issue(path, `Expected number, got ${typeof value}`, 'invalid_type', { expected: 'number', received: typeof value })],
    };
  }

  /** Minimum value (inclusive) */
  min(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v >= n ? null : issue(p, message ?? `Must be at least ${n}`, 'too_small'),
    );
    return clone as any;
  }

  /** Maximum value (inclusive) */
  max(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v <= n ? null : issue(p, message ?? `Must be at most ${n}`, 'too_big'),
    );
    return clone as any;
  }

  /** Must be an integer */
  int(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      Number.isInteger(v) ? null : issue(p, message ?? 'Must be an integer', 'invalid_int'),
    );
    return clone as any;
  }

  /** Must be positive (> 0) */
  positive(message?: string): this {
    return this.min(1, message ?? 'Must be positive');
  }

  /** Must be negative (< 0) */
  negative(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v < 0 ? null : issue(p, message ?? 'Must be negative', 'too_big'),
    );
    return clone as any;
  }

  /** Must be >= 0 */
  nonnegative(message?: string): this {
    return this.min(0, message ?? 'Must be non-negative');
  }

  /** Must be finite */
  finite(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      Number.isFinite(v) ? null : issue(p, message ?? 'Must be finite', 'not_finite'),
    );
    return clone as any;
  }

  /** Must be divisible by n */
  multipleOf(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v % n === 0 ? null : issue(p, message ?? `Must be a multiple of ${n}`, 'not_multiple'),
    );
    return clone as any;
  }

  /** Valid port number (0–65535, integer) */
  port(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      Number.isInteger(v) && v >= 0 && v <= 65535
        ? null
        : issue(p, message ?? 'Must be a valid port (0–65535)', 'invalid_port'),
    );
    return clone as any;
  }

  // --- Transforms ---

  /** Round to nearest integer */
  round(): this {
    const clone = this._clone();
    clone._transforms.push((v) => Math.round(v));
    return clone as any;
  }

  /** Floor to integer */
  floor(): this {
    const clone = this._clone();
    clone._transforms.push((v) => Math.floor(v));
    return clone as any;
  }

  /** Ceil to integer */
  ceil(): this {
    const clone = this._clone();
    clone._transforms.push((v) => Math.ceil(v));
    return clone as any;
  }

  /** Clamp between min and max */
  clamp(min: number, max: number): this {
    const clone = this._clone();
    clone._transforms.push((v) => Math.min(Math.max(v, min), max));
    return clone as any;
  }

  /** Absolute value */
  abs(): this {
    const clone = this._clone();
    clone._transforms.push((v) => Math.abs(v));
    return clone as any;
  }
}
