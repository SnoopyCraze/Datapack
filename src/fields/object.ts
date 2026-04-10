import { type ValidationIssue, issue } from '../errors';
import { BaseField } from './base';
import type { SchemaShape, InferShape } from '../types';

export class ObjectField<S extends SchemaShape> extends BaseField<InferShape<S>> {
  readonly _kind = 'object';
  /** @internal */
  _shape: S;

  constructor(shape: S) {
    super();
    this._shape = shape;
  }

  _coerce(
    value: unknown,
    path: (string | number)[],
  ): { value: InferShape<S>; issues: ValidationIssue[] } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        value: {} as any,
        issues: [
          issue(path, `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`, 'invalid_type', {
            expected: 'object',
            received: typeof value,
          }),
        ],
      };
    }

    const issues: ValidationIssue[] = [];
    const result: Record<string, unknown> = {};
    const input = value as Record<string, unknown>;

    for (const [key, field] of Object.entries(this._shape)) {
      const parsed = field._parse(input[key], [...path, key]);
      if (parsed.issues.length > 0) {
        issues.push(...parsed.issues);
      } else if (parsed.value !== undefined) {
        result[key] = parsed.value;
      }
    }

    return { value: result as InferShape<S>, issues };
  }

  protected _clone(): this {
    const clone = super._clone();
    clone._shape = { ...this._shape };
    return clone;
  }
}
