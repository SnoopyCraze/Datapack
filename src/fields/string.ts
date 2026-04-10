import { type ValidationIssue, issue } from '../errors';
import { BaseField } from './base';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IP_V4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_RE = /^[0-9a-fA-F]+$/;

export class StringField extends BaseField<string> {
  readonly _kind = 'string';

  _coerce(value: unknown, path: (string | number)[]): { value: string; issues: ValidationIssue[] } {
    if (typeof value === 'string') return { value, issues: [] };
    if (typeof value === 'number' || typeof value === 'boolean') {
      return { value: String(value), issues: [] };
    }
    return {
      value: '' as any,
      issues: [issue(path, `Expected string, got ${typeof value}`, 'invalid_type', { expected: 'string', received: typeof value })],
    };
  }

  /** Minimum length */
  min(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.length >= n ? null : issue(p, message ?? `Must be at least ${n} characters`, 'too_small'),
    );
    return clone as any;
  }

  /** Maximum length */
  max(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.length <= n ? null : issue(p, message ?? `Must be at most ${n} characters`, 'too_big'),
    );
    return clone as any;
  }

  /** Exact length */
  length(n: number, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.length === n ? null : issue(p, message ?? `Must be exactly ${n} characters`, 'invalid_length'),
    );
    return clone as any;
  }

  /** Must not be empty */
  nonempty(message?: string): this {
    return this.min(1, message ?? 'Must not be empty');
  }

  /** Must match regex */
  pattern(re: RegExp, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      re.test(v) ? null : issue(p, message ?? `Must match pattern ${re}`, 'invalid_pattern'),
    );
    return clone as any;
  }

  /** Must contain substring */
  includes(str: string, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.includes(str) ? null : issue(p, message ?? `Must contain "${str}"`, 'invalid_string'),
    );
    return clone as any;
  }

  /** Must start with prefix */
  startsWith(prefix: string, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.startsWith(prefix) ? null : issue(p, message ?? `Must start with "${prefix}"`, 'invalid_string'),
    );
    return clone as any;
  }

  /** Must end with suffix */
  endsWith(suffix: string, message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) =>
      v.endsWith(suffix) ? null : issue(p, message ?? `Must end with "${suffix}"`, 'invalid_string'),
    );
    return clone as any;
  }

  /** Valid email address */
  email(message?: string): this {
    return this.pattern(EMAIL_RE, message ?? 'Invalid email address');
  }

  /** Valid URL (http/https) */
  url(message?: string): this {
    return this.pattern(URL_RE, message ?? 'Invalid URL');
  }

  /** Valid UUID */
  uuid(message?: string): this {
    return this.pattern(UUID_RE, message ?? 'Invalid UUID');
  }

  /** Valid IPv4 address */
  ip(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) => {
      if (!IP_V4_RE.test(v)) return issue(p, message ?? 'Invalid IP address', 'invalid_ip');
      const parts = v.split('.').map(Number);
      if (parts.some((n) => n > 255)) return issue(p, message ?? 'Invalid IP address', 'invalid_ip');
      return null;
    });
    return clone as any;
  }

  /** URL-safe slug (lowercase alphanumeric + hyphens) */
  slug(message?: string): this {
    return this.pattern(SLUG_RE, message ?? 'Invalid slug');
  }

  /** Hexadecimal string */
  hex(message?: string): this {
    return this.pattern(HEX_RE, message ?? 'Invalid hex string');
  }

  /** Valid JSON string */
  json(message?: string): this {
    const clone = this._clone();
    clone._rules.push((v, p) => {
      try {
        JSON.parse(v);
        return null;
      } catch {
        return issue(p, message ?? 'Invalid JSON string', 'invalid_json');
      }
    });
    return clone as any;
  }

  // --- Transforms ---

  /** Trim whitespace */
  trim(): this {
    const clone = this._clone();
    clone._transforms.push((v) => v.trim());
    return clone as any;
  }

  /** Convert to lowercase */
  lowercase(): this {
    const clone = this._clone();
    clone._transforms.push((v) => v.toLowerCase());
    return clone as any;
  }

  /** Convert to uppercase */
  uppercase(): this {
    const clone = this._clone();
    clone._transforms.push((v) => v.toUpperCase());
    return clone as any;
  }

  /** Capitalize first letter */
  capitalize(): this {
    const clone = this._clone();
    clone._transforms.push((v) => v.charAt(0).toUpperCase() + v.slice(1));
    return clone as any;
  }
}
