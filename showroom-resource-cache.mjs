// Share immutable GPU resources while each visible card owns a lease. Only idle
// entries are evicted, and a small work queue bounds concurrent decode/uploads.
export function createSharedResourceCache(load, { capacity = 48, concurrency = 3, dispose = () => {} } = {}) {
  const entries = new Map(), queue = [];
  let running = 0;
  function trim() {
    for (const [key, entry] of entries) {
      if (entries.size <= capacity) break;
      if (!entry.ready || entry.refs) continue;
      entries.delete(key);
      dispose(entry.value);
    }
  }
  function pump() {
    while (running < concurrency && queue.length) {
      const task = queue.shift();
      running++;
      Promise.resolve().then(task.load).then(task.resolve, task.reject).finally(() => { running--; pump(); });
    }
  }
  return async function acquire(key) {
    let entry = entries.get(key);
    if (!entry) {
      entry = { refs: 0, ready: false };
      entries.set(key, entry);
      entry.promise = new Promise((resolve, reject) => {
        queue.push({ load: () => load(key), resolve, reject });
        pump();
      }).then(value => {
        entry.value = value;
        entry.ready = true;
        trim();
        return value;
      }).catch(error => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
    } else {
      entries.delete(key);
      entries.set(key, entry);
    }
    entry.refs++;
    let value;
    try { value = await entry.promise; }
    catch (error) { entry.refs--; throw error; }
    let released = false;
    return { value, release() {
      if (released) return;
      released = true;
      entry.refs--;
      trim();
    } };
  };
}

// Fronts and backs have independent ownership: different cards often use the
// same back. A bundle preserves face order while sharing each unique resource.
// A failed bundle releases its successful leases, including late completions.
export function createSharedResourceBundleCache(load, options = {}) {
  const acquire = createSharedResourceCache(load, { capacity: 96, ...options });
  return async function acquireBundle(keys) {
    const unique = [...new Set(keys)];
    const results = await Promise.allSettled(unique.map(acquire));
    const leases = new Map();
    for (let index = 0; index < results.length; index++) {
      if (results[index].status === 'fulfilled') leases.set(unique[index], results[index].value);
    }
    const failure = results.find(result => result.status === 'rejected');
    if (failure) {
      for (const lease of leases.values()) lease.release();
      throw failure.reason;
    }
    let released = false;
    return {
      value: keys.map(key => leases.get(key).value),
      release() {
        if (released) return;
        released = true;
        for (const lease of leases.values()) lease.release();
      },
    };
  };
}
