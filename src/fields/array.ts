import { type ValidationIssue, issue } from '../errors';
import { BaseField } from './base';

export class ArrayField<E extends BaseField = BaseField> extends BaseField<
  E['_output'][]
> {
  readonly _kind = 'array';
  /** @internal */
  _element: E;

  constructor(element: E) {
    super();
    this._element = element;
  }

  _coerce(
    value: unknown,
    path: (string | number)[],
  ): { value: E['_output'][]; issues: ValidationIssue[] } {
    if (!Array.isArray(value)) {
      return {
        value: [] as any,
        issues: [
          issue(path, `Expected array, got ${typeof value}`, 'invalid_type', {
            expected: 'array',
            received: typeof value,
          }),
        ],
      };
    }

    const issues: ValidationIssue[] = [];
    const result: E['_output'][] = [];

    for (let i = 0; i < value.length; i++) {
      const parsed = this._element._parse(value[i], [...path, i]);
      if (parsed.issues.length > 0) {
        issues.push(...parsed.issues);
      } else {
        result.push(parsed.value);
      }
    }

    return { value: result, issues };
  }

  /** Minimum number of elements */
  min(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.length >= n
        ? null
        : issue(p, message ?? `Must have at least ${n} items`, 'too_small'),
    );
    return clone as any;
  }

  /** Maximum number of elements */
  max(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.length <= n
        ? null
        : issue(p, message ?? `Must have at most ${n} items`, 'too_big'),
    );
    return clone as any;
  }

  /** Exact number of elements */
  length(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.length === n
        ? null
        : issue(p, message ?? `Must have exactly ${n} items`, 'invalid_length'),
    );
    return clone as any;
  }

  /** Must have at least one element */
  nonempty(message?: string): this {
    return this.min(1, message ?? 'Must not be empty');
  }

  /** All elements must be unique (by JSON stringification for objects) */
  unique(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) => {
      const seen = new Set<string>();
      for (const item of v) {
        const key = typeof item === 'object' ? JSON.stringify(item) : String(item);
        if (seen.has(key)) {
          return issue(p, message ?? 'All elements must be unique', 'not_unique');
        }
        seen.add(key);
      }
      return null;
    });
    return clone as any;
  }

  protected _clone(): this {
    const clone = super._clone();
    clone._element = this._element;
    return clone;
  }
}
