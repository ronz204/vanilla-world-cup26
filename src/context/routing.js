export function route(pattern, view) {
  const rx = pattern
    .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    .replace(/\//g, '\\/');
  return { pattern: new RegExp(`^${rx}$`), view };
}

export function router(routes, outlet) {
  let currentDestroy = null;

  function resolve() {
    const hash = location.hash.slice(1) || '/';
    if (currentDestroy) { currentDestroy(); currentDestroy = null; }

    for (const { pattern, view } of routes) {
      const match = pattern.exec(hash);
      if (!match) continue;
      currentDestroy = view(outlet, match.groups ?? {}) ?? null;
      return;
    };

    outlet.innerHTML = '<p>404</p>';
  };

  window.addEventListener('hashchange', resolve);
  resolve();

  return {
    navigate: (path) => { location.hash = path; },
    current: () => location.hash.slice(1) || '/',
  };
};
