import { hasToken } from '@shared/http/auth.js';

export function createGuards(shell) {
  const withAuth = (view) => (outlet, params) => {
    if (!hasToken()) { location.hash = '/'; return; }
    shell.show();
    return view(outlet, params);
  };

  const withLogin = (view) => (outlet, params) => {
    if (hasToken()) { location.hash = '/dream-team'; return; }
    shell.hide();
    return view(outlet, params);
  };

  return { withAuth, withLogin };
}
