export function route(pattern, view) {
  const rx = pattern
    .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    .replace(/\//g, '\\/');
  return { pattern: new RegExp(`^${rx}$`), view };
}

export function createRouter(routes, outlet) {
  let currentDestroy = null;

  function resolve() {
    const hash = location.hash.slice(1) || '/';
    const match = routes.find(r => r.pattern.test(hash));

    if (currentDestroy) { currentDestroy(); currentDestroy = null; }

    if (!match) { outlet.innerHTML = '<p>404</p>'; return; }

    const params = match.pattern.exec(hash)?.groups ?? {};
    currentDestroy = match.view(outlet, params) ?? null;
  }

  window.addEventListener('hashchange', resolve);
  resolve();

  return {
    navigate: (path) => { location.hash = path; },
    current: () => location.hash.slice(1) || '/',
  };
};
