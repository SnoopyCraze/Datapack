import { StringField } from './fields/string';
import { NumberField } from './fields/number';
import { BooleanField } from './fields/boolean';
import { DateField } from './fields/date';
import { ArrayField } from './fields/array';
import { EnumField } from './fields/enum';
import { ObjectField } from './fields/object';
import { BaseField } from './fields/base';
import { Schema } from './schema';
import { Store } from './store';
import { dpFetch, clearFetchCache, createEndpoint } from './fetch';
import { parseEnv } from './env';
import * as utils from './utils';
import type { SchemaShape, InferShape, Prettify } from './types';

// ── Field constructors ───────────────────────────────────────────────

/** Create a string field */
function string(): StringField {
  return new StringField();
}

/** Create a number field */
function number(): NumberField {
  return new NumberField();
}

/** Create a boolean field */
function boolean(): BooleanField {
  return new BooleanField();
}

/** Create a date field */
function date(): DateField {
  return new DateField();
}

/** Create an array field */
function array<F extends BaseField>(element: F): ArrayField<F> {
  return new ArrayField(element);
}

/** Create an enum field */
function enumField<T extends readonly string[]>(values: T): EnumField<T>;
function enumField<T extends readonly string[]>(values: [...T]): EnumField<T>;
function enumField<T extends readonly string[]>(values: T): EnumField<T> {
  return new EnumField(values);
}

/** Create a nested object field */
function object<S extends SchemaShape>(shape: S): ObjectField<S> {
  return new ObjectField(shape);
}

// ── The dp function ──────────────────────────────────────────────────

/**
 * Create a schema from a shape definition.
 *
 * ```ts
 * const User = dp({
 *   name: dp.string().min(1),
 *   email: dp.string().email(),
 *   age: dp.number().optional(),
 * });
 *
 * type User = dp.infer<typeof User>;
 * const user = User.parse(rawData);
 * ```
 */
function dp<S extends SchemaShape>(shape: S): Schema<S> {
  return new Schema(shape);
}

// Attach field constructors
dp.string = string;
dp.number = number;
dp.boolean = boolean;
dp.date = date;
dp.array = array;
dp.enum = enumField;
dp.object = object;

// Attach modules
dp.fetch = dpFetch;
dp.clearCache = clearFetchCache;
dp.endpoint = createEndpoint;
dp.store = function <S extends SchemaShape>(schema: Schema<S>, initial: unknown) {
  return new Store(schema, initial);
};
dp.env = parseEnv;

// Attach utilities
dp.pick = utils.pick;
dp.omit = utils.omit;
dp.merge = utils.merge;
dp.clone = utils.clone;
dp.equals = utils.equals;
dp.diff = utils.diff;
dp.flatten = utils.flatten;
dp.unflatten = utils.unflatten;
dp.hash = utils.hash;
dp.mapValues = utils.mapValues;
dp.filterKeys = utils.filterKeys;
dp.groupBy = utils.groupBy;
dp.sortBy = utils.sortBy;
dp.uniqueBy = utils.uniqueBy;

// ── Type inference helper ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace dp {
  /** Infer the TypeScript type from a Schema */
  export type infer<S> = S extends Schema<infer Shape>
    ? Prettify<InferShape<Shape>>
    : never;
}

// ── Exports ──────────────────────────────────────────────────────────

export { dp };
export default dp;

// Re-export everything for advanced/granular usage
export { Schema } from './schema';
export { DataPack } from './pack';
export { Store } from './store';
export { DatapackError } from './errors';
export type { ValidationIssue } from './errors';
export type { SafeParseResult, SchemaShape, InferShape, Prettify } from './types';
export { BaseField } from './fields/base';
export { StringField } from './fields/string';
export { NumberField } from './fields/number';
export { BooleanField } from './fields/boolean';
export { DateField } from './fields/date';
export { ArrayField } from './fields/array';
export { EnumField } from './fields/enum';
export { ObjectField } from './fields/object';
export { dpFetch, clearFetchCache, createEndpoint } from './fetch';
export type { DpFetchOptions } from './fetch';
export { parseEnv } from './env';
export {
  pick,
  omit,
  merge,
  clone,
  equals,
  diff,
  flatten,
  unflatten,
  hash,
  mapValues,
  filterKeys,
  groupBy,
  sortBy,
  uniqueBy,
} from './utils';
