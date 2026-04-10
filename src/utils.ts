/**
 * Standalone data utilities — no schema required.
 * Accessible via `dp.pick()`, `dp.omit()`, `dp.merge()`, etc.
 */

/** Pick specific keys from an object */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/** Omit specific keys from an object */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const excluded = new Set<string>(keys as string[]);
  const result = {} as any;
  for (const key of Object.keys(obj)) {
    if (!excluded.has(key)) result[key] = obj[key];
  }
  return result;
}

/** Deep merge two objects (source overrides target) */
export function merge<T extends Record<string, any>, U extends Record<string, any>>(
  target: T,
  source: U,
): T & U {
  const result = { ...target } as any;
  for (const key of Object.keys(source)) {
    const targetVal = result[key];
    const sourceVal = (source as any)[key];
    if (
      isPlainObject(targetVal) &&
      isPlainObject(sourceVal)
    ) {
      result[key] = merge(targetVal, sourceVal);
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}

/** Deep clone an object */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** Check deep equality between two values */
export function equals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => equals(val, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => equals(aObj[key], bObj[key]));
  }

  return false;
}

/** Compute a shallow diff between two objects */
export function diff<T extends Record<string, any>>(
  prev: T,
  next: T,
): Partial<T> {
  const changes: Partial<T> = {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of allKeys) {
    if (!equals((prev as any)[key], (next as any)[key])) {
      (changes as any)[key] = (next as any)[key];
    }
  }
  return changes;
}

/** Flatten a nested object into dot-notation keys */
export function flatten(
  obj: Record<string, any>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      Object.assign(result, flatten(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (isPlainObject(item)) {
          Object.assign(result, flatten(item, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = item;
        }
      });
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/** Unflatten dot-notation keys back into nested objects */
export function unflatten(obj: Record<string, unknown>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.replace(/\[(\d+)]/g, '.$1').split('.');
    let current = result;
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
  return result;
}

/** Simple string hash of an object (FNV-1a, deterministic) */
export function hash(value: unknown): string {
  const str = JSON.stringify(value, (_k, v) =>
    v instanceof Date ? v.toISOString() : v,
  );
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Map over object values */
export function mapValues<T extends Record<string, any>, U>(
  obj: T,
  fn: (value: T[keyof T], key: string) => U,
): Record<keyof T, U> {
  const result = {} as Record<keyof T, U>;
  for (const [key, value] of Object.entries(obj)) {
    (result as any)[key] = fn(value, key);
  }
  return result;
}

/** Filter object entries */
export function filterKeys<T extends Record<string, any>>(
  obj: T,
  predicate: (key: string, value: T[keyof T]) => boolean,
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(key, value)) (result as any)[key] = value;
  }
  return result;
}

/** Group an array of objects by a key */
export function groupBy<T extends Record<string, any>>(
  items: T[],
  key: keyof T & string,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const groupKey = String(item[key]);
    (result[groupKey] ??= []).push(item);
  }
  return result;
}

/** Sort an array of objects by a key */
export function sortBy<T extends Record<string, any>>(
  items: T[],
  key: keyof T & string,
  order: 'asc' | 'desc' = 'asc',
): T[] {
  const sorted = [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
  return order === 'desc' ? sorted.reverse() : sorted;
}

/** Remove duplicate objects by a key */
export function uniqueBy<T extends Record<string, any>>(
  items: T[],
  key: keyof T & string,
): T[] {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}
