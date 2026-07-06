const PREFIX = "wc26:";

export const cache = {
  set(endpoint, data) {
    localStorage.setItem(PREFIX + endpoint, JSON.stringify({ data, savedAt: Date.now() }));
  },
  get(endpoint) {
    return JSON.parse(localStorage.getItem(PREFIX + endpoint));
  },
  clear(endpoint) {
    localStorage.removeItem(PREFIX + endpoint);
  },
};
