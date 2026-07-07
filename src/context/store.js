export function store(initial) {
  let state = initial;
  const subscribers = new Set();

  const notify = (next) => {
    if (Object.keys(next).every(k => next[k] === state[k])) return;
    state = next;
    subscribers.forEach(fn => fn(state));
  };

  return {
    get:     ()     => state,
    set:     (partial) => notify({ ...state, ...partial }),
    update:  (fn)   => notify({ ...state, ...fn(state) }),
    subscribe: (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); },
    reset:   ()     => { state = initial; subscribers.forEach(fn => fn(state)); },
    destroy: ()     => subscribers.clear(),
  };
}
