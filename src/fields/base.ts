import { type ValidationIssue, issue } from '../errors';

export type ValidationRule<T = any> = (
  value: T,
  path: (string | number)[],
) => ValidationIssue | null;

export type TransformFn<T = any> = (value: T) => T;

/**
 * Base class for all field types.
 *
 * Generic params:
 *   T        — the output type this field produces
 *   Optional — whether this field is optional (true/false)
 */
export abstract class BaseField<T = any, Optional extends boolean = false> {
  /** @internal phantom — do not use at runtime */
  declare readonly _output: Optional extends true ? T | undefined : T;
  /** @internal phantom */
  declare readonly _optional: Optional;

  /** @internal */
  _rules: ValidationRule<T>[] = [];
  /** @internal */
  _transforms: TransformFn<T>[] = [];
  /** @internal */
  _isOptional = false;
  /** @internal */
  _defaultValue: T | undefined = undefined;
  /** @internal */
  _hasDefault = false;
  /** @internal */
  _label: string | undefined;
  /** @internal */
  abstract readonly _kind: string;

  /** Mark this field as optional */
  optional(): BaseField<T, true> {
    const clone = this._clone();
    clone._isOptional = true;
    return clone as any;
  }

  /** Provide a default value (field becomes non-optional in output) */
  default(value: T): BaseField<T, false> {
    const clone = this._clone();
    clone._defaultValue = value;
    clone._hasDefault = true;
    return clone as any;
  }

  /** Human-readable label for error messages */
  label(name: string): this {
    const clone = this._clone();
    clone._label = name;
    return clone as any;
  }

  /** Add a custom validation rule */
  refine(
    check: (value: T) => boolean,
    message = 'Validation failed',
  ): this {
    const clone = this._clone();
    clone._rules.push((v, path) =>
      check(v) ? null : issue(path, message, 'custom'),
    );
    return clone as any;
  }

  /** Add a custom transform */
  transform(fn: TransformFn<T>): this {
    const clone = this._clone();
    clone._transforms.push(fn);
    return clone as any;
  }

  /** @internal — parse a raw value into this field's type */
  abstract _coerce(value: unknown, path: (string | number)[]): { value: T; issues: ValidationIssue[] };

  /** @internal — validate the coerced value */
  _validate(value: T, path: (string | number)[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const rule of this._rules) {
      const result = rule(value, path);
      if (result) issues.push(result);
    }
    return issues;
  }

  /** @internal — apply transforms */
  _applyTransforms(value: T): T {
    let result = value;
    for (const fn of this._transforms) {
      result = fn(result);
    }
    return result;
  }

  /**
   * @internal — full parse pipeline: coerce → validate → transform
   * Returns the final value and any issues encountered.
   */
  _parse(
    raw: unknown,
    path: (string | number)[],
  ): { value: T | undefined; issues: ValidationIssue[] } {
    // Handle undefined / null
    if (raw === undefined || raw === null) {
      if (this._hasDefault) {
        return { value: this._defaultValue as T, issues: [] };
      }
      if (this._isOptional) {
        return { value: undefined, issues: [] };
      }
      return {
        value: undefined,
        issues: [issue(path, `${this._label ?? (path.join('.') || 'Value')} is required`, 'required')],
      };
    }

    // Coerce
    const coerced = this._coerce(raw, path);
    if (coerced.issues.length > 0) {
      return { value: undefined, issues: coerced.issues };
    }

    // Validate
    const validationIssues = this._validate(coerced.value, path);
    if (validationIssues.length > 0) {
      return { value: undefined, issues: validationIssues };
    }

    // Transform
    const transformed = this._applyTransforms(coerced.value);
    return { value: transformed, issues: [] };
  }

  /** @internal */
  protected _clone(): this {
    const clone = Object.create(Object.getPrototypeOf(this));
    Object.assign(clone, this);
    clone._rules = [...this._rules];
    clone._transforms = [...this._transforms];
    return clone;
  }
}
