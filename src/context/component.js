function snapshotFocus(root) {
  const el = document.activeElement;
  if (!root.contains(el) || !('selectionStart' in el)) return null;
  const key = el.id
    ? `#${el.id}`
    : (() => {
        const [k, v] = Object.entries(el.dataset ?? {})[0] ?? [];
        return k ? `[data-${k.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`)}="${v}"]` : null;
      })();
  return key ? { key, start: el.selectionStart, end: el.selectionEnd } : null;
}

export function component(root, store, render) {
  const paint = () => {
    const focus = snapshotFocus(root);
    root.innerHTML = render(store.get());
    if (focus) {
      const el = root.querySelector(focus.key);
      if (el) { el.focus(); el.setSelectionRange(focus.start, focus.end); }
    }
  };
  const unsubscribe = store.subscribe(paint);
  paint();
  return unsubscribe;
}
