# datapack

[![npm version](https://img.shields.io/npm/v/datapack.svg?style=flat-square)](https://www.npmjs.com/package/datapack)
[![npm downloads](https://img.shields.io/npm/dm/datapack.svg?style=flat-square)](https://www.npmjs.com/package/datapack)
[![bundle size](https://img.shields.io/bundlephobia/minzip/datapack?style=flat-square)](https://bundlephobia.com/package/datapack)
[![types](https://img.shields.io/npm/types/datapack.svg?style=flat-square)](https://www.npmjs.com/package/datapack)
[![license](https://img.shields.io/npm/l/datapack.svg?style=flat-square)](https://github.com/SnoopyCraze/datapack/blob/main/LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](https://github.com/SnoopyCraze/datapack/blob/main/package.json)

> The universal data toolkit. Define once, use everywhere.

`datapack` is a zero-dependency TypeScript library that unifies the jobs normally split across a validator, a form library, an HTTP client, and a state store. Define a schema once and reuse it to **validate**, **transform**, **serialize**, **fetch**, and **store** data through one cohesive API.

```ts
import { dp } from 'datapack';

const User = dp({
  name: dp.string().min(1),
  email: dp.string().email(),
  age: dp.number().int().min(0).optional(),
});

type User = dp.infer<typeof User>;

const user = User.parse(rawInput);            // validate
const pack = User.pack(rawInput);             // wrap for serialization
const body = pack.toFormData();               // send as multipart
const json = pack.toJSON(2);                  // or JSON
const data = await dp.fetch('/api/users/1', { schema: User }); // fetch + validate
const store = dp.store(User, user);           // reactive state
```

## Why datapack?

Most apps end up with the same shape of data defined four or five times: once in a Zod schema, once in a TypeScript interface, once in a form library, once in an API client, once in a state store. These copies drift. `datapack` keeps one source of truth and gives you the whole pipeline.

- **One schema, many surfaces.** The same `Schema` validates input, narrows types, serializes to JSON / FormData / URL params / CSV / Headers / Map, parses env vars, binds REST endpoints, and backs a reactive store.
- **Tiny and dependency-free.** No runtime dependencies. Tree-shakeable ESM + CJS builds.
- **TypeScript-first.** Full type inference with `dp.infer<typeof Schema>`. No codegen.
- **Familiar.** If you've used Zod, the field API will feel immediately natural.

## Install

```bash
npm install datapack
```

Requires Node.js 18+ (uses native `fetch`, `FormData`, `structuredClone`).

## Features

### Schemas and validation

```ts
const Post = dp({
  id: dp.number().int(),
  title: dp.string().min(1).max(200),
  tags: dp.array(dp.string()),
  status: dp.enum(['draft', 'published']),
  publishedAt: dp.date().optional(),
  author: dp.object({
    name: dp.string(),
    email: dp.string().email(),
  }),
});

const result = Post.safeParse(input);
if (!result.ok) {
  console.error(result.errors.issues);
}
```

Schemas compose with `.partial()`, `.pick(...)`, `.omit(...)`, `.extend({...})`, and `.merge(other)`.

### DataPack: serialize anywhere!

```ts
const pack = User.pack(data);

pack.toObject();     // plain object (structured clone)
pack.toJSON();       // JSON string
pack.toFormData();   // FormData (nested keys flattened)
pack.toURLParams();  // query string
pack.toHeaders();    // Headers (primitive values only)
pack.toCSV();        // single-row CSV with header
pack.toMap();        // Map<string, unknown>
pack.toEntries();    // [key, value][]
```

And back the other way:

```ts
DataPack.fromJSON(jsonString, User);
DataPack.fromFormData(formData, User);
DataPack.fromURLParams(searchString, User);
```

### Schema-validated fetch

```ts
const user = await dp.fetch('/api/users/1', {
  schema: User,
  retry: 3,
  timeout: 5000,
  cacheTTL: 30_000,
});
```

Features: retries with exponential backoff, timeouts, GET-response caching, automatic JSON / text detection, and schema validation on every response.

### REST endpoints

```ts
const users = dp.endpoint('/api/users', User, { baseURL: 'https://example.com' });

await users.list();
await users.get(1);
await users.create({ name: 'Ada', email: 'ada@example.com' });
await users.update(1, { name: 'Ada L.' });
await users.patch(1, { name: 'Ada L.' });
await users.remove(1);
```

### Reactive store

```ts
const store = dp.store(User, { name: 'Ada', email: 'ada@example.com' });

store.get();
store.update({ name: 'Ada L.' });   // merges + revalidates
store.set(nextState);               // replaces + revalidates
store.reset();

const unsub = store.subscribe((state, prev) => console.log(state));
store.select((s) => s.email, (email) => console.log('email changed:', email));
```

All mutations are validated through the schema, so the store can never hold invalid state.

### Env var parsing

```ts
const config = dp.env({
  PORT: dp.number().default(3000),
  DB_URL: dp.string(),
  DEBUG: dp.boolean().default(false),
});
```

Reads from `process.env`, coerces strings into the right types, and throws a single aggregated error if anything is missing or invalid.

### Utilities

Everyday data helpers that pair well with schemas:

```ts
dp.pick, dp.omit, dp.merge, dp.clone, dp.equals, dp.diff,
dp.flatten, dp.unflatten, dp.hash, dp.mapValues, dp.filterKeys,
dp.groupBy, dp.sortBy, dp.uniqueBy
```

## API surface

| Area        | Entry point                             |
| ----------- | --------------------------------------- |
| Schema      | `dp({...})`, `Schema`                   |
| Fields      | `dp.string/number/boolean/date/array/enum/object` |
| Serialize   | `schema.pack(data)`, `DataPack`         |
| Fetch       | `dp.fetch`, `dp.endpoint`, `dp.clearCache` |
| Store       | `dp.store(schema, initial)`             |
| Env         | `dp.env(shape)`                         |
| Utilities   | `dp.pick`, `dp.omit`, `dp.merge`, ...   |
| Errors      | `DatapackError`, `ValidationIssue`      |
| Types       | `dp.infer<typeof Schema>`               |

## License

MIT