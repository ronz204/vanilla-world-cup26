export function delegate(root, event, selector, handler) {
  const fn = (e) => {
    const target = e.target.closest(selector);
    if (target) handler(e, target);
  };
  root.addEventListener(event, fn);
  return () => root.removeEventListener(event, fn);
}
