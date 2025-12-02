// Simple in-memory cache for API GET requests so we only fetch once per session.
// This is intentionally lightweight and client-side only.
//
// Usage:
//   cachedGet('/users/1', () => apiClient.get<UserResponse>('/users/1'))
//
// The first call runs the fetcher; subsequent calls with the same key return
// the same resolved value (or Promise) without hitting the network again.
//
// If a request fails, the cache entry is cleared so a later call can retry.

type CacheKey = string;

const getCache = new Map<CacheKey, Promise<unknown>>();

function makeKey(path: string, extra?: string) {
  return extra ? `${path}::${extra}` : path;
}

export function cachedGet<T>(
  path: string,
  fetcher: () => Promise<T>,
  extraKey?: string
): Promise<T> {
  const key = makeKey(path, extraKey);

  if (getCache.has(key)) {
    return getCache.get(key) as Promise<T>;
  }

  const promise = fetcher().catch((err) => {
    // On error, allow future retries.
    getCache.delete(key);
    throw err;
  });

  getCache.set(key, promise);
  return promise;
}

// Optional helpers to clear cache entries when data is mutated.

export function invalidateCachedGet(pathStartsWith?: string) {
  if (!pathStartsWith) {
    getCache.clear();
    return;
  }
  for (const key of getCache.keys()) {
    if (key.startsWith(pathStartsWith)) {
      getCache.delete(key);
    }
  }
}


