import { type ValidationIssue, issue } from '../errors';
import { BaseField } from './base';

const TRUTHY = new Set([true, 1, '1', 'true', 'yes', 'on']);
const FALSY = new Set([false, 0, '0', 'false', 'no', 'off']);

export class BooleanField extends BaseField<boolean> {
  readonly _kind = 'boolean';

  _coerce(value: unknown, path: (string | number)[]): { value: boolean; issues: ValidationIssue[] } {
    if (typeof value === 'boolean') return { value, issues: [] };

    // Coerce common truthy/falsy values
    if (TRUTHY.has(value as any)) return { value: true, issues: [] };
    if (FALSY.has(value as any)) return { value: false, issues: [] };

    return {
      value: false as any,
      issues: [issue(path, `Expected boolean, got ${typeof value}`, 'invalid_type', { expected: 'boolean', received: typeof value })],
    };
  }
}
