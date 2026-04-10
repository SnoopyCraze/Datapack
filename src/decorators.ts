import { BaseField } from './fields/base';
import { Schema } from './schema';
import { DataPack } from './pack';
import type { SchemaShape } from './types';

// Storage for decorator metadata
const fieldMetadata = new WeakMap<object, Map<string, BaseField>>();

/**
 * Property decorator — associates a field definition with a class property.
 *
 * ```ts
 * class User {
 *   @field(dp.string().min(1))
 *   name!: string;
 *
 *   @field(dp.string().email())
 *   email!: string;
 * }
 * ```
 */
export function field(fieldDef: BaseField): (
  target: undefined,
  context: ClassFieldDecoratorContext,
) => void;
export function field(fieldDef: BaseField) {
  return function (_target: undefined, context: ClassFieldDecoratorContext) {
    const fieldName = String(context.name);
    context.addInitializer(function (this: any) {
      const proto = Object.getPrototypeOf(this).constructor;
      if (!fieldMetadata.has(proto)) {
        fieldMetadata.set(proto, new Map());
      }
      fieldMetadata.get(proto)!.set(fieldName, fieldDef);
    });
  };
}

/**
 * Class decorator — turns a class into a schema-backed data class.
 *
 * Adds static methods: `.parse()`, `.safeParse()`, `.pack()`, `.schema`.
 * Adds instance methods: `.validate()`, `.pack()`, `.toJSON()`.
 *
 * ```ts
 * @datapack
 * class User {
 *   @field(dp.string().min(1))
 *   name!: string;
 * }
 *
 * const user = User.parse({ name: 'Alice' });
 * user.pack().toJSON();
 * ```
 */
export function datapack<T extends new (...args: any[]) => any>(
  target: T,
  _context: ClassDecoratorContext,
): T {
  // Create an instance to trigger field initializers so metadata gets registered
  void new target();

  const fields = fieldMetadata.get(target);
  if (!fields || fields.size === 0) {
    throw new Error(
      `@datapack: No @field decorators found on ${target.name}. ` +
      `Add @field(dp.string()) etc. to at least one property.`,
    );
  }

  const shape: SchemaShape = Object.fromEntries(fields.entries());
  const schema = new Schema(shape);

  // Attach static methods
  Object.defineProperties(target, {
    schema: {
      value: schema,
      writable: false,
    },
    parse: {
      value(input: unknown) {
        const data = schema.parse(input);
        const instance = new target();
        Object.assign(instance, data);
        return instance;
      },
    },
    safeParse: {
      value(input: unknown) {
        const result = schema.safeParse(input);
        if (result.ok) {
          const instance = new target();
          Object.assign(instance, result.data);
          return { ok: true as const, data: instance, errors: null };
        }
        return result;
      },
    },
    is: {
      value(input: unknown): boolean {
        return schema.is(input);
      },
    },
  });

  // Attach instance methods to prototype
  target.prototype.validate = function () {
    return schema.safeParse(this);
  };

  target.prototype.pack = function () {
    const data = schema.parse(this);
    return new DataPack(data, schema);
  };

  target.prototype.toJSON = function () {
    const data: Record<string, unknown> = {};
    for (const key of schema.keys) {
      data[key] = (this as any)[key];
    }
    return data;
  };

  return target;
}

// Type augmentation helpers for decorated classes
export interface DatapackClass<T> {
  new (): T;
  schema: Schema<any>;
  parse(input: unknown): T;
  safeParse(input: unknown): { ok: true; data: T; errors: null } | { ok: false; data: null; errors: any };
  is(input: unknown): input is T;
}

export interface DatapackInstance {
  validate(): { ok: boolean; data: any; errors: any };
  pack(): DataPack<any>;
  toJSON(): Record<string, unknown>;
}
