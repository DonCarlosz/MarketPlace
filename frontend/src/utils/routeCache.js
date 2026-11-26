// Offline-first Stale-While-Revalidate (SWR) route caches backed by in-memory LRU + IndexedDB (idb-keyval)
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

const IDB_PREFIX = 'obuy_swr_v1:';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days offline retention

const persistTimers = new Map();

function scheduleIdbWrite(namespace, store) {
  if (typeof indexedDB === 'undefined') return;
  if (persistTimers.has(namespace)) {
    clearTimeout(persistTimers.get(namespace));
  }
  const timer = setTimeout(() => {
    persistTimers.delete(namespace);
    try {
      const payload = {
        savedAt: Date.now(),
        entries: Array.from(store.entries()),
      };
      idbSet(`${IDB_PREFIX}${namespace}`, payload).catch(() => {});
    } catch {
      // Ignore quota or private-mode IDB errors
    }
  }, 120);
  persistTimers.set(namespace, timer);
}

const createPersistedCache = (namespace, maxEntries = 30) => {
  const store = new Map();
  let hydrated = false;
  const listeners = new Set();

  const notify = () => {
    listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // Ignore subscriber error
      }
    });
  };

  // Hydrate asynchronously from IndexedDB once on startup without blocking initial paint
  if (typeof indexedDB !== 'undefined') {
    idbGet(`${IDB_PREFIX}${namespace}`)
      .then((record) => {
        hydrated = true;
        if (!record || !Array.isArray(record.entries)) return;
        if (record.savedAt && Date.now() - record.savedAt > CACHE_TTL_MS) {
          idbDel(`${IDB_PREFIX}${namespace}`).catch(() => {});
          return;
        }
        let changed = false;
        for (const [k, v] of record.entries) {
          if (!store.has(k)) {
            store.set(k, v);
            changed = true;
          }
        }
        while (store.size > maxEntries) {
          const oldestKey = store.keys().next().value;
          store.delete(oldestKey);
        }
        if (changed) notify();
      })
      .catch(() => {
        hydrated = true;
      });
  } else {
    hydrated = true;
  }

  return {
    get(key) {
      if (!key || !store.has(key)) return null;
      const value = store.get(key);
      store.delete(key);
      store.set(key, value);
      return value;
    },
    set(key, value) {
      if (!key) return;
      if (store.has(key)) store.delete(key);
      store.set(key, value);
      if (store.size > maxEntries) {
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
      }
      scheduleIdbWrite(namespace, store);
    },
    delete(key) {
      if (!key) return;
      if (store.delete(key)) {
        scheduleIdbWrite(namespace, store);
      }
    },
    clear() {
      store.clear();
      if (typeof indexedDB !== 'undefined') {
        idbDel(`${IDB_PREFIX}${namespace}`).catch(() => {});
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      if (hydrated && store.size > 0) {
        // Already hydrated synchronously
      }
      return () => listeners.delete(listener);
    },
  };
};

export const landingRouteCache = createPersistedCache('landing', 4);
export const marketListingsCache = createPersistedCache('market', 24);
export const profileRouteCache = createPersistedCache('profile', 16);
export const chatInboxCache = createPersistedCache('chat_inbox', 5);
export const chatMessagesCache = createPersistedCache('chat_msgs', 30);
export const listingDetailCache = createPersistedCache('listing_detail', 30);
export const routeScrollCache = new Map();

export const clearUserRouteCaches = () => {
  profileRouteCache.clear();
  chatInboxCache.clear();
  chatMessagesCache.clear();
  routeScrollCache.clear();
};
