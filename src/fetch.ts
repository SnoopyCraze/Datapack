import type { Schema } from './schema';
import type { Prettify, InferShape, SchemaShape } from './types';

export interface DpFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Schema to validate the response against */
  schema?: Schema<any>;
  /** Retry count on failure (default: 0) */
  retry?: number;
  /** Retry delay in ms (default: 1000, doubles each retry) */
  retryDelay?: number;
  /** Timeout in ms */
  timeout?: number;
  /** Base URL to prepend */
  baseURL?: string;
  /** URL query parameters */
  params?: Record<string, string | number | boolean>;
  /** Cache TTL in ms. Pass 0 to disable. */
  cacheTTL?: number;
}

const fetchCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Schema-validated fetch with retries, timeout, and caching.
 */
export async function dpFetch<S extends SchemaShape>(
  url: string,
  options: DpFetchOptions & { schema: Schema<S> },
): Promise<Prettify<InferShape<S>>>;
export async function dpFetch(
  url: string,
  options?: DpFetchOptions,
): Promise<unknown>;
export async function dpFetch(
  url: string,
  options: DpFetchOptions = {},
): Promise<unknown> {
  const {
    method = 'GET',
    headers = {},
    body,
    schema,
    retry = 0,
    retryDelay = 1000,
    timeout,
    baseURL = '',
    params,
    cacheTTL,
  } = options;

  // Build full URL
  let fullURL = baseURL + url;
  if (params) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      search.append(k, String(v));
    }
    fullURL += (fullURL.includes('?') ? '&' : '?') + search.toString();
  }

  // Check cache
  const cacheKey = `${method}:${fullURL}`;
  if (cacheTTL && cacheTTL > 0 && method === 'GET') {
    const cached = fetchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  // Build request init
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  // Timeout via AbortController
  let controller: AbortController | undefined;
  if (timeout) {
    controller = new AbortController();
    init.signal = controller.signal;
    setTimeout(() => controller!.abort(), timeout);
  }

  // Execute with retries
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const response = await fetch(fullURL, init);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      let data: unknown;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Validate through schema if provided
      if (schema) {
        // If the response is an array, validate each item
        if (Array.isArray(data)) {
          data = data.map((item) => schema.parse(item));
        } else {
          data = schema.parse(data);
        }
      }

      // Cache the result
      if (cacheTTL && cacheTTL > 0 && method === 'GET') {
        fetchCache.set(cacheKey, { data, expiresAt: Date.now() + cacheTTL });
      }

      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retry) {
        await sleep(retryDelay * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}

/** Clear the fetch cache */
export function clearFetchCache(): void {
  fetchCache.clear();
}

/**
 * Create a REST endpoint bound to a schema.
 * Returns an object with `list`, `get`, `create`, `update`, `remove` methods.
 */
export function createEndpoint<S extends SchemaShape>(
  baseUrl: string,
  schema: Schema<S>,
  defaults: Omit<DpFetchOptions, 'schema' | 'method' | 'body'> = {},
) {
  type T = Prettify<InferShape<S>>;

  return {
    /** GET baseUrl → T[] */
    async list(options?: DpFetchOptions): Promise<T[]> {
      return dpFetch(baseUrl, { ...defaults, ...options, schema }) as unknown as Promise<T[]>;
    },

    /** GET baseUrl/:id → T */
    async get(id: string | number, options?: DpFetchOptions): Promise<T> {
      return dpFetch(`${baseUrl}/${id}`, { ...defaults, ...options, schema }) as Promise<T>;
    },

    /** POST baseUrl → T */
    async create(data: Partial<T>, options?: DpFetchOptions): Promise<T> {
      return dpFetch(baseUrl, {
        ...defaults,
        ...options,
        method: 'POST',
        body: data,
        schema,
      }) as Promise<T>;
    },

    /** PUT baseUrl/:id → T */
    async update(
      id: string | number,
      data: Partial<T>,
      options?: DpFetchOptions,
    ): Promise<T> {
      return dpFetch(`${baseUrl}/${id}`, {
        ...defaults,
        ...options,
        method: 'PUT',
        body: data,
        schema,
      }) as Promise<T>;
    },

    /** PATCH baseUrl/:id → T */
    async patch(
      id: string | number,
      data: Partial<T>,
      options?: DpFetchOptions,
    ): Promise<T> {
      return dpFetch(`${baseUrl}/${id}`, {
        ...defaults,
        ...options,
        method: 'PATCH',
        body: data,
        schema,
      }) as Promise<T>;
    },

    /** DELETE baseUrl/:id */
    async remove(id: string | number, options?: DpFetchOptions): Promise<void> {
      await dpFetch(`${baseUrl}/${id}`, {
        ...defaults,
        ...options,
        method: 'DELETE',
      });
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
