export const wind = {
  header:       'sticky top-0 z-50 bg-surface border-b border-border',
  inner:        'max-w-screen-xl mx-auto flex items-center justify-between px-4 md:px-6 h-14',

  logoWrap:     'flex items-center gap-3 shrink-0',
  logo:         'font-display text-[15px] font-semibold tracking-tighter text-ink',

  pill:         'bg-pill-green/20 px-2 py-[3px] rounded-full flex items-center gap-1.5 border border-pill-green',
  pillDot:      'w-1.5 h-1.5 rounded-full bg-primary af-pulse',
  pillText:     'font-mono text-[10px] text-pill-text uppercase leading-none',

  nav:          'hidden md:flex md:items-center md:gap-0.5',
  navLink:      'flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft hover:text-primary hover:bg-surface-raised transition-all',
  navActive:    'text-primary bg-surface-raised',
  navIcon:      'material-symbols-outlined text-[15px]',

  actions:      'flex items-center gap-1',
  logout:       'flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-dim hover:text-danger hover:bg-danger/5 transition-all cursor-pointer border-none bg-transparent',
  logoutIcon:   'material-symbols-outlined text-[16px]',

  hamburger:    'md:hidden flex items-center justify-center w-8 h-8 rounded-[6px] text-ink-soft hover:bg-surface-raised transition-colors border-none bg-transparent cursor-pointer',
  hambIcon:     'material-symbols-outlined text-[22px]',

  mobileNav:    'md:hidden border-t border-border bg-surface',
  mobileLink:   'flex items-center gap-2.5 px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft hover:text-primary hover:bg-surface-raised transition-all border-b border-border/40 last:border-0',
  mobileActive: 'text-primary bg-surface-raised',
  mobileIcon:   'material-symbols-outlined text-[17px]',
};
