export const w = {
  // Page / card
  page:         'px-4 md:px-6 py-6',
  card:         'af-ticket max-w-5xl mx-auto bg-surface rounded-[10px] border border-border overflow-visible relative',
  notchL:       'af-notch af-notch-l border-r border-border',
  notchR:       'af-notch af-notch-r border-l border-border',

  // Stub
  stub:         'flex items-center justify-between gap-3 px-6 py-4 bg-surface-raised',
  stubLeft:     'flex flex-col gap-0.5',
  stubTag:      'font-mono text-[10px] font-semibold tracking-widest text-ink-soft uppercase',
  stubLabel:    'font-display text-[14px] font-semibold text-ink',
  stubRight:    'flex items-center gap-3 shrink-0',
  countBadge:   'font-mono text-[12px] font-semibold text-ink-soft bg-surface border border-border rounded-full px-3 py-0.5 shrink-0',

  // Status pills
  pill:         'flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[11px] shrink-0',
  pillOk:       'border-pill-green bg-pill-green/20 text-pill-text',
  pillLoading:  'border-border bg-surface text-ink-dim',
  pillRetry:    'border-gold/40 bg-gold/10 text-gold',
  pillStale:    'border-stale/30 bg-stale/10 text-stale',
  pillError:    'border-danger/30 bg-danger/5 text-danger',

  // Perforation
  perf:         'af-perf h-1 w-full opacity-50',

  // Body
  body:         'p-4 md:p-6',

  // Tabs
  tabBar:       'flex items-center gap-1.5 mb-5',
  tab:          'font-mono text-[11px] font-semibold px-3.5 py-1.5 rounded-full border cursor-pointer transition-all select-none',
  tabActive:    'bg-primary text-white border-primary',
  tabInactive:  'bg-surface border-border text-ink-dim hover:text-ink hover:border-ink-soft',

  // Banners
  errorBanner:  'mb-4 px-3 py-3 rounded-[6px] bg-danger/5 border-l-2 border-danger flex items-center justify-between gap-3',
  errorText:    'font-mono text-[12px] text-danger',
  retryBtn:     'font-mono text-[11px] font-semibold text-primary hover:underline cursor-pointer bg-transparent border-none p-0 shrink-0',
  staleBanner:  'mb-4 px-3 py-2 rounded-[6px] bg-stale/5 border border-stale/20 flex items-center gap-2',
  staleBannerText: 'font-mono text-[11px] text-stale',

  // Search
  searchWrap:   'relative mb-4',
  searchIcon:   'absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-ink-dim pointer-events-none',
  searchInput:  'w-full bg-surface-raised border border-border rounded-[6px] py-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-dim focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all',

  // Game list
  gameList:     'flex flex-col gap-2',

  // Game row (shared base)
  gameRow:      'flex items-center gap-2 bg-surface-raised border border-border rounded-[6px] px-3 py-2.5',
  gameRowExact:   'border-primary/40 bg-primary/5',
  gameRowResult:  'border-gold/40 bg-gold/5',
  gameRowMiss:    'border-danger/30 bg-danger/5',
  teamSection:  'flex items-center gap-1.5 min-w-0 flex-1',
  teamSectionR: 'flex items-center gap-1.5 min-w-0 flex-1 flex-row-reverse',
  teamFlag:     'w-6 h-[17px] object-cover rounded-sm shrink-0',
  teamName:     'text-[12px] font-medium text-ink truncate',
  gameInfo:     'font-mono text-[9px] text-ink-dim shrink-0 hidden sm:block',

  // Prediction inputs (pending tab)
  predWrap:     'flex items-center gap-1 shrink-0',
  predInput:    'w-9 h-8 font-mono text-[14px] font-semibold text-ink text-center bg-surface border border-border rounded-[6px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all',
  predSep:      'font-mono text-[14px] font-bold text-ink-dim',
  savedBadge:   'font-mono text-[10px] font-semibold text-primary shrink-0 hidden sm:block w-3',

  // Score display (results tab)
  scoreWrap:    'flex flex-col items-center gap-0.5 shrink-0 px-2',
  scoreActual:  'font-mono text-[16px] font-semibold text-ink leading-none',
  scorePred:    'font-mono text-[10px] text-ink-dim leading-none',

  // Result chips
  chipExact:    'font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 shrink-0',
  chipResult:   'font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30 shrink-0',
  chipMiss:     'font-mono text-[9px] font-semibold px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/30 shrink-0',

  // Stats bar (results tab)
  statsBar:     'flex items-center mb-4 p-3 bg-surface-raised rounded-[6px] border border-border',
  statItem:     'flex flex-col items-center gap-0.5 flex-1',
  statValueExact:  'font-mono text-[20px] font-semibold text-primary leading-none',
  statValueResult: 'font-mono text-[20px] font-semibold text-gold leading-none',
  statValueMiss:   'font-mono text-[20px] font-semibold text-danger leading-none',
  statValueTotal:  'font-mono text-[20px] font-semibold text-ink leading-none',
  statLabel:    'font-mono text-[9px] text-ink-dim uppercase tracking-wider',
  statDivider:  'w-px h-8 bg-border shrink-0',

  // Empty / skeleton
  emptyState:   'py-10 text-center',
  emptyIcon:    'material-symbols-outlined text-[40px] text-ink-dim',
  emptyText:    'font-mono text-[11px] text-ink-dim mt-3 uppercase tracking-wide',
  skeleton:     'h-[48px] rounded-[6px] af-shimmer mb-2',
};
