export function store(initial) {
  let state = initial;
  const subscribers = new Set();

  return {
    get: () => state,
    set: (partial) => {
      const next = { ...state, ...partial };
      if (Object.keys(next).every(k => next[k] === state[k])) return;
      state = next;
      subscribers.forEach(fn => fn(state));
    },
    subscribe: (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    reset: () => {
      state = initialState;
      subscribers.forEach(fn => fn(state));
    },
    destroy: () => subscribers.clear(),
  };
}
