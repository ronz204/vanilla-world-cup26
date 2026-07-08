import { wind } from './styles.js';
import { store } from '@context/store.js';
import { delegate } from '@context/delegate.js';
import { component } from '@context/component.js';
import { clearToken } from '@shared/http/auth.js';

const NAV_LINKS = [
  { href: '#/dream-team',   label: 'Dream Team',  icon: 'group' },
  { href: '#/head-to-head', label: 'Cara a Cara', icon: 'compare_arrows' },
  { href: '#/tracker',      label: 'Sorpresas',   icon: 'notifications' },
  { href: '#/quiniela',     label: 'Quiniela',    icon: 'edit_note' },
  { href: '#/draw',         label: 'Sorteo',      icon: 'shuffle' },
];

function navItem(href, label, icon, activeRoute, linkCls, iconCls, activeCls) {
  const cls = activeRoute === href ? `${linkCls} ${activeCls}` : linkCls;
  return `<a href="${href}" class="${cls}">
    <span class="${iconCls}">${icon}</span>
    <span>${label}</span>
  </a>`;
}

function render({ activeRoute, mobileOpen }) {
  const desktopLinks = NAV_LINKS.map(({ href, label, icon }) =>
    navItem(href, label, icon, activeRoute, wind.navLink, wind.navIcon, wind.navActive)
  ).join('');

  const mobileLinks = NAV_LINKS.map(({ href, label, icon }) =>
    navItem(href, label, icon, activeRoute, wind.mobileLink, wind.mobileIcon, wind.mobileActive)
  ).join('');

  return `
    <div class="${wind.inner}">
      <div class="${wind.logoWrap}">
        <span class="${wind.logo}">SPLICE WC26</span>
        <div class="${wind.pill}" role="status" aria-label="Sistema en linea">
          <div class="${wind.pillDot}" aria-hidden="true"></div>
          <span class="${wind.pillText}">En vivo</span>
        </div>
      </div>

      <nav class="${wind.nav}" aria-label="Modulos">
        ${desktopLinks}
      </nav>

      <div class="${wind.actions}">
        <button data-shell-logout class="${wind.logout}" aria-label="Cerrar sesion">
          <span class="${wind.logoutIcon}">logout</span>
          <span class="hidden md:inline">Salir</span>
        </button>
        <button data-shell-hamburger class="${wind.hamburger}"
          aria-label="${mobileOpen ? 'Cerrar menu' : 'Abrir menu'}"
          aria-expanded="${mobileOpen}">
          <span class="${wind.hambIcon}">${mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </div>
    </div>

    <div class="${wind.mobileNav} ${mobileOpen ? '' : 'hidden'}" aria-hidden="${!mobileOpen}">
      ${mobileLinks}
    </div>
  `;
}

export function mountShell(el) {
  el.className = wind.header;

  const state = store({ activeRoute: location.hash, mobileOpen: false });

  component(el, state, render);

  delegate(el, 'click', '[data-shell-hamburger]', () => {
    state.update(s => ({ mobileOpen: !s.mobileOpen }));
  });

  delegate(el, 'click', '[data-shell-logout]', () => {
    clearToken();
    location.hash = '/';
  });

  window.addEventListener('hashchange', () => {
    state.set({ activeRoute: location.hash, mobileOpen: false });
  });

  return {
    show: () => el.removeAttribute('hidden'),
    hide: () => el.setAttribute('hidden', ''),
  };
}
