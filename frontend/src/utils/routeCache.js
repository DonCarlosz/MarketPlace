// Bounded in-memory Stale-While-Revalidate (SWR) route caches for instant zero-flash navigation

const createBoundedCache = (maxEntries = 30) => {
  const store = new Map();

  return {
    get(key) {
      if (!key || !store.has(key)) return null;
      const value = store.get(key);
      // Refresh LRU position
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
    },
    delete(key) {
      if (key) store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
};

export const profileRouteCache = createBoundedCache(20);
export const chatInboxCache = createBoundedCache(5);
export const chatMessagesCache = createBoundedCache(40);
export const listingDetailCache = createBoundedCache(40);

export const clearUserRouteCaches = () => {
  profileRouteCache.clear();
  chatInboxCache.clear();
  chatMessagesCache.clear();
};
