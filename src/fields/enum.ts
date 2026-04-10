import { type ValidationIssue, issue } from '../errors';
import { BaseField } from './base';

export class EnumField<T extends readonly string[]> extends BaseField<T[number]> {
  readonly _kind = 'enum';
  /** @internal */
  _values: T;

  constructor(values: T) {
    super();
    this._values = values;
  }

  _coerce(
    value: unknown,
    path: (string | number)[],
  ): { value: T[number]; issues: ValidationIssue[] } {
    if (typeof value !== 'string') {
      return {
        value: '' as any,
        issues: [
          issue(path, `Expected one of: ${this._values.join(', ')}`, 'invalid_type', {
            expected: this._values.join(' | '),
            received: typeof value,
          }),
        ],
      };
    }

    if (!(this._values as readonly string[]).includes(value)) {
      return {
        value: '' as any,
        issues: [
          issue(path, `Must be one of: ${this._values.join(', ')}`, 'invalid_enum', {
            expected: this._values.join(' | '),
            received: value,
          }),
        ],
      };
    }

    return { value: value as T[number], issues: [] };
  }

  protected _clone(): this {
    const clone = super._clone();
    clone._values = this._values;
    return clone;
  }
}
