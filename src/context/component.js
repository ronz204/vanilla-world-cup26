export function component(root, store, render) {
  const paint = () => { root.innerHTML = render(store.get()); };
  const unsubscribe = store.subscribe(paint);
  paint();
  return unsubscribe;
};
