const PREFIX = 'wc26:';

export const cache = {
  set(endpoint, data) {
    try {
      localStorage.setItem(PREFIX + endpoint, JSON.stringify({ data, savedAt: Date.now() }));
    } catch { /* QuotaExceededError: dato no cacheado, app sigue funcionando */ }
  },
  get(endpoint) {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + endpoint));
    } catch { return null; }
  },
  clear(endpoint) {
    localStorage.removeItem(PREFIX + endpoint);
  },
  extract(endpoint, extractFn) {
    const entry = this.get(endpoint);
    if (!entry) return null;
    try { return { data: extractFn(entry.data), savedAt: entry.savedAt }; } catch { return null; }
  },
};
