interface Entry<T> {
  value: T;
  expires: number;
}

export function memoStore<T>(ttlMs: number) {
  const store = new Map<string, Entry<T>>();
  const pending = new Map<string, Promise<T>>();

  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = store.get(key);
      if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
      const inflight = pending.get(key);
      if (inflight) return inflight;

      const promise = load()
        .then((value) => {
          store.set(key, { value, expires: Date.now() + ttlMs });
          pending.delete(key);
          return value;
        })
        .catch((error: unknown) => {
          pending.delete(key);
          throw error;
        });
      pending.set(key, promise);
      return promise;
    },
  };
}

export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
