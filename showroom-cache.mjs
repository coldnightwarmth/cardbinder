// Cache in-flight work as well as results; failed reads can always be retried.
export function createShowroomCache(load, { ttl = 60000, capacity = 24, now = Date.now, dispose = () => {} } = {}) {
  const entries = new Map();
  return function get(key) {
    const cached = entries.get(key);
    if (cached && (!cached.ready || now() - cached.time < ttl)) {
      entries.delete(key); entries.set(key, cached);
      return cached.promise;
    }
    if (cached?.ready) dispose(cached.value);
    const entry = { ready: false, time: now() };
    entry.promise = Promise.resolve().then(() => load(key)).then(value => {
      entry.ready = true; entry.value = value; entry.time = now();
      for (const [oldKey, old] of entries) {
        if (entries.size <= capacity) break;
        if (old.ready && oldKey !== key) { entries.delete(oldKey); dispose(old.value); }
      }
      return value;
    }).catch(error => {
      if (entries.get(key) === entry) entries.delete(key);
      throw error;
    });
    entries.set(key, entry);
    for (const [oldKey, old] of entries) {
      if (entries.size <= capacity) break;
      if (old.ready && oldKey !== key) { entries.delete(oldKey); dispose(old.value); }
    }
    return entry.promise;
  };
}
