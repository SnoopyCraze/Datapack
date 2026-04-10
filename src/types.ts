import type { BaseField } from './fields/base';

/** A record of field names to field definitions */
export type SchemaShape = Record<string, BaseField<any, any>>;

/** Extract the output type from a single field */
export type FieldOutput<F> = F extends BaseField<infer T, any> ? T : never;

/** Keys of required (non-optional) fields in a schema shape */
export type RequiredKeys<S extends SchemaShape> = {
  [K in keyof S]: S[K] extends BaseField<any, true> ? never : K;
}[keyof S];

/** Keys of optional fields in a schema shape */
export type OptionalKeys<S extends SchemaShape> = {
  [K in keyof S]: S[K] extends BaseField<any, true> ? K : never;
}[keyof S];

/** Infer the TypeScript type from a schema shape */
export type InferShape<S extends SchemaShape> = {
  [K in RequiredKeys<S>]: FieldOutput<S[K]>;
} & {
  [K in OptionalKeys<S>]?: FieldOutput<S[K]>;
};

/** Clean up intersection types for readability */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/** Result of safeParse */
export type SafeParseResult<T> =
  | { ok: true; data: T; errors: null }
  | { ok: false; data: null; errors: import('./errors').DatapackError };
