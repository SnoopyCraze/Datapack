import type { Schema } from './schema';

/**
 * A DataPack wraps validated data and provides serialization to multiple formats.
 * Created via `schema.pack(data)`.
 */
export class DataPack<T extends Record<string, any>> {
  readonly data: T;
  /** @internal */
  private _schema: Schema<any>;

  constructor(data: T, schema: Schema<any>) {
    this.data = data;
    this._schema = schema;
  }

  /** Get a plain object copy */
  toObject(): T {
    return structuredClone(this.data);
  }

  /** Serialize to a JSON string */
  toJSON(indent?: number): string {
    return JSON.stringify(this.data, this._replacer, indent);
  }

  /** Create a FormData instance */
  toFormData(): FormData {
    const fd = new FormData();
    this._flatEntries(this.data, '').forEach(([key, value]) => {
      fd.append(key, value);
    });
    return fd;
  }

  /** Create a URLSearchParams string */
  toURLParams(): string {
    const params = new URLSearchParams();
    this._flatEntries(this.data, '').forEach(([key, value]) => {
      params.append(key, value);
    });
    return params.toString();
  }

  /** Create a Headers object (string values only, skips complex types) */
  toHeaders(): Headers {
    const headers = new Headers();
    for (const [key, value] of Object.entries(this.data)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        headers.set(key, String(value));
      }
    }
    return headers;
  }

  /** Convert to CSV row (single row, headers optional) */
  toCSV(options?: { headers?: boolean; delimiter?: string }): string {
    const delimiter = options?.delimiter ?? ',';
    const keys = this._schema.keys;
    const values = keys.map((k) => this._csvEscape(this.data[k]));
    const lines: string[] = [];
    if (options?.headers !== false) {
      lines.push(keys.join(delimiter));
    }
    lines.push(values.join(delimiter));
    return lines.join('\n');
  }

  /** Convert to a Map */
  toMap(): Map<string, unknown> {
    return new Map(Object.entries(this.data));
  }

  /** Convert to [key, value][] entries */
  toEntries(): [string, unknown][] {
    return Object.entries(this.data);
  }

  // --- Static "unpack" constructors ---

  /** Parse a JSON string through the schema */
  static fromJSON(
    json: string,
    schema: Schema<any>,
  ): DataPack<any> {
    const data = JSON.parse(json);
    return schema.pack(data);
  }

  /** Parse FormData through the schema */
  static fromFormData(
    formData: FormData,
    schema: Schema<any>,
  ): DataPack<any> {
    const data: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      setNestedValue(data, key, value);
    });
    return schema.pack(data);
  }

  /** Parse URLSearchParams through the schema */
  static fromURLParams(
    params: string | URLSearchParams,
    schema: Schema<any>,
  ): DataPack<any> {
    const searchParams = typeof params === 'string' ? new URLSearchParams(params) : params;
    const data: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      setNestedValue(data, key, value);
    });
    return schema.pack(data);
  }

  // --- Internal helpers ---

  private _replacer(_key: string, value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    return value;
  }

  private _flatEntries(
    obj: Record<string, any>,
    prefix: string,
  ): [string, string][] {
    const entries: [string, string][] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value === null || value === undefined) continue;
      if (value instanceof Date) {
        entries.push([fullKey, value.toISOString()]);
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === 'object' && item !== null && !(item instanceof Date)) {
            entries.push(...this._flatEntries(item, `${fullKey}[${i}]`));
          } else {
            entries.push([`${fullKey}[${i}]`, String(item instanceof Date ? item.toISOString() : item)]);
          }
        });
      } else if (typeof value === 'object') {
        entries.push(...this._flatEntries(value, fullKey));
      } else {
        entries.push([fullKey, String(value)]);
      }
    }
    return entries;
  }

  private _csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

/** Set a nested value from a dot/bracket-notation key like "a.b[0].c" */
function setNestedValue(obj: Record<string, any>, path: string, value: unknown): void {
  const parts = path.replace(/\[(\d+)]/g, '.$1').split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    const isNextIndex = /^\d+$/.test(nextPart);
    if (!(part in current)) {
      current[part] = isNextIndex ? [] : {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}
