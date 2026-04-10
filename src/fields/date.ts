import { type ValidationIssue, issue } from '../errors';
import { BaseField } from './base';

export class DateField extends BaseField<Date> {
  readonly _kind = 'date';

  _coerce(value: unknown, path: (string | number)[]): { value: Date; issues: ValidationIssue[] } {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return { value: value, issues: [issue(path, 'Invalid date', 'invalid_date')] };
      }
      return { value, issues: [] };
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return { value: date, issues: [issue(path, 'Invalid date', 'invalid_date')] };
      }
      return { value: date, issues: [] };
    }
    return {
      value: new Date() as any,
      issues: [issue(path, `Expected date, got ${typeof value}`, 'invalid_type', { expected: 'date', received: typeof value })],
    };
  }

  /** Must be after the given date */
  min(date: Date | string | number, message?: string): this {
    const min = new Date(date);
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.getTime() >= min.getTime() ? null : issue(p, message ?? `Must be after ${min.toISOString()}`, 'too_small'),
    );
    return clone as any;
  }

  /** Must be before the given date */
  max(date: Date | string | number, message?: string): this {
    const max = new Date(date);
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.getTime() <= max.getTime() ? null : issue(p, message ?? `Must be before ${max.toISOString()}`, 'too_big'),
    );
    return clone as any;
  }

  /** Must be in the past */
  past(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.getTime() < Date.now() ? null : issue(p, message ?? 'Must be in the past', 'invalid_date'),
    );
    return clone as any;
  }

  /** Must be in the future */
  future(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.getTime() > Date.now() ? null : issue(p, message ?? 'Must be in the future', 'invalid_date'),
    );
    return clone as any;
  }
}
