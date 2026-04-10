import { DatapackError } from './errors';
import { BaseField } from './fields';
import type {
  SchemaShape,
  InferShape,
  Prettify,
  SafeParseResult,
} from './types';
import { DataPack } from './pack';

/**
 * A Schema defines the shape and validation rules for a data structure.
 * Create one with `dp({ ... })`.
 */
export class Schema<S extends SchemaShape> {
  /** @internal */
  readonly _shape: S;

  constructor(shape: S) {
    this._shape = shape;
  }

  /**
   * Parse and validate input data. Throws DatapackError on failure.
   */
  parse(input: unknown): Prettify<InferShape<S>> {
    const result = this.safeParse(input);
    if (!result.ok) throw result.errors;
    return result.data;
  }

  /**
   * Parse and validate without throwing.
   * Returns `{ ok: true, data }` or `{ ok: false, errors }`.
   */
  safeParse(input: unknown): SafeParseResult<Prettify<InferShape<S>>> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      const err = new DatapackError([
        {
          path: [],
          message: `Expected object, got ${Array.isArray(input) ? 'array' : typeof input}`,
          code: 'invalid_type',
          expected: 'object',
          received: typeof input,
        },
      ]);
      return { ok: false, data: null, errors: err };
    }

    const record = input as Record<string, unknown>;
    const issues: import('./errors').ValidationIssue[] = [];
    const result: Record<string, unknown> = {};

    for (const [key, field] of Object.entries(this._shape)) {
      const parsed = field._parse(record[key], [key]);
      if (parsed.issues.length > 0) {
        issues.push(...parsed.issues);
      } else if (parsed.value !== undefined) {
        result[key] = parsed.value;
      }
    }

    if (issues.length > 0) {
      return { ok: false, data: null, errors: new DatapackError(issues) };
    }
    return { ok: true, data: result as Prettify<InferShape<S>>, errors: null };
  }

  /**
   * Type guard — returns true if the value matches this schema.
   */
  is(value: unknown): value is Prettify<InferShape<S>> {
    return this.safeParse(value).ok;
  }

  /**
   * Parse and wrap in a DataPack for serialization.
   */
  pack(input: unknown): DataPack<Prettify<InferShape<S>>> {
    const data = this.parse(input);
    return new DataPack(data, this as Schema<any>);
  }

  /**
   * Create a new schema where all fields are optional.
   */
  partial(): Schema<{ [K in keyof S]: ReturnType<S[K]['optional']> }> {
    const newShape: Record<string, BaseField<any, any>> = {};
    for (const [key, field] of Object.entries(this._shape)) {
      newShape[key] = field.optional() as BaseField<any, any>;
    }
    return new Schema(newShape) as any;
  }

  /**
   * Create a new schema with only the specified keys.
   */
  pick<K extends keyof S & string>(...keys: K[]): Schema<Pick<S, K>> {
    const newShape: Record<string, BaseField> = {};
    for (const key of keys) {
      newShape[key] = this._shape[key];
    }
    return new Schema(newShape as any);
  }

  /**
   * Create a new schema without the specified keys.
   */
  omit<K extends keyof S & string>(...keys: K[]): Schema<Omit<S, K>> {
    const excluded = new Set(keys as string[]);
    const newShape: Record<string, BaseField> = {};
    for (const [key, field] of Object.entries(this._shape)) {
      if (!excluded.has(key)) newShape[key] = field;
    }
    return new Schema(newShape as any);
  }

  /**
   * Create a new schema with additional fields.
   */
  extend<E extends SchemaShape>(extra: E): Schema<S & E> {
    return new Schema({ ...this._shape, ...extra } as S & E);
  }

  /**
   * Merge with another schema.
   */
  merge<O extends SchemaShape>(other: Schema<O>): Schema<S & O> {
    return new Schema({ ...this._shape, ...other._shape } as S & O);
  }

  /**
   * Get the list of field names.
   */
  get keys(): (keyof S & string)[] {
    return Object.keys(this._shape) as (keyof S & string)[];
  }

  /**
   * Get the shape definition.
   */
  get shape(): S {
    return this._shape;
  }
}
