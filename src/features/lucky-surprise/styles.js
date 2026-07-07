export const w = {
  // Page wrapper
  page:         'px-4 md:px-6 py-6',
  card:         'af-ticket max-w-7xl mx-auto bg-surface rounded-[10px] border border-border overflow-visible relative',
  notchL:       'af-notch af-notch-l border-r border-border',
  notchR:       'af-notch af-notch-r border-l border-border',

  // Stub
  stub:         'flex items-center justify-between gap-3 px-6 py-4 bg-surface-raised',
  stubLeft:     'flex flex-col gap-0.5',
  stubTag:      'font-mono text-[10px] font-semibold tracking-widest text-ink-soft uppercase',
  stubLabel:    'font-display text-[14px] font-semibold text-ink',
  stubRight:    'flex items-center gap-3 shrink-0',

  // Interval selector
  intervalSelect: 'font-mono text-[11px] text-ink-soft bg-surface border border-border rounded-full px-3 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary',

  // Count badge
  countBadge:   'font-mono text-[12px] font-semibold text-ink-soft bg-surface border border-border rounded-full px-3 py-0.5 shrink-0',

  // Status pills
  pill:         'flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[11px] shrink-0',
  pillLive:     'border-pill-green bg-pill-green/20 text-pill-text',
  pillLoading:  'border-border bg-surface text-ink-dim',
  pillRetry:    'border-gold/40 bg-gold/10 text-gold',
  pillStale:    'border-stale/30 bg-stale/10 text-stale',
  pillError:    'border-danger/30 bg-danger/5 text-danger',
  pillDot:      'w-1.5 h-1.5 rounded-full bg-primary af-pulse shrink-0',

  stalePill:    'font-mono text-[10px] text-stale bg-stale/10 border border-stale/20 px-2 py-0.5 rounded-full shrink-0',

  // Perforation
  perf:         'af-perf h-1 w-full opacity-50',

  // Body / grid
  body:         'p-4 md:p-6',
  grid:         'grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-0',

  // Panels
  panel:        'flex flex-col',
  panelL:       'lg:border-r lg:border-border lg:pr-6',
  panelR:       'lg:pl-6',
  panelHead:    'flex items-center justify-between gap-2 mb-3',
  panelTitle:   'font-display text-[16px] font-semibold text-ink',

  // Search
  searchWrap:   'relative mb-3',
  searchIcon:   'absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-ink-dim pointer-events-none',
  searchInput:  'w-full bg-surface-raised border border-border rounded-[6px] py-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-dim focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all',

  // Rows — left panel
  scrollList:   'flex flex-col gap-1.5 max-h-[400px] overflow-y-auto',
  row:          'flex items-center justify-between gap-2 bg-surface-raised border border-border rounded-[6px] px-3 py-2.5 transition-colors',
  rowFav:       'border-primary/40 bg-primary/5',
  rowLeft:      'flex items-center gap-2 min-w-0',
  teamFlag:     'w-7 h-5 object-cover rounded-sm shrink-0',
  teamName:     'text-[13px] font-medium text-ink truncate',
  teamCode:     'font-mono text-[10px] text-ink-dim shrink-0',

  // Star button (left panel)
  starBtn:      'w-7 h-7 flex items-center justify-center rounded-[6px] border border-border text-ink-dim hover:text-gold hover:bg-gold/10 hover:border-gold/30 active:scale-95 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed',
  starBtnActive:'text-gold bg-gold/10 border-gold/30',

  // Rows — right panel (favorites)
  rowRight:     'flex items-center gap-2 shrink-0',
  rowLosing:    'border-danger/40 bg-danger/5',
  rowLosingLive:'border-danger/60 bg-danger/10',

  // Match score variants
  scoreLosing:  'font-mono text-[14px] font-semibold text-danger',
  scoreWinning: 'font-mono text-[14px] font-semibold text-gold',
  scoreDraw:    'font-mono text-[14px] font-semibold text-ink-soft',

  // Status tags next to score
  tagLive:      'font-mono text-[9px] font-semibold text-primary bg-pill-green/20 border border-pill-green px-1.5 py-0.5 rounded-full uppercase tracking-wider',
  tagFinished:  'font-mono text-[9px] text-ink-dim bg-surface border border-border px-1.5 py-0.5 rounded-full uppercase tracking-wider',

  // No match
  noMatch:      'font-mono text-[11px] text-ink-dim',

  // Remove button (right panel)
  removeBtn:    'w-7 h-7 flex items-center justify-center rounded-[6px] text-ink-dim border border-border hover:text-danger hover:bg-danger/10 hover:border-danger/30 active:scale-95 transition-all shrink-0',
  removeBtnIcon:'material-symbols-outlined text-[16px]',

  // Stale banner (right panel)
  staleBanner:  'mb-3',

  // Error banner
  errorBanner:  'mb-3 px-3 py-3 rounded-[6px] bg-danger/5 border-l-2 border-danger flex items-center justify-between gap-3',
  errorText:    'font-mono text-[12px] text-danger',
  retryBtn:     'font-mono text-[11px] font-semibold text-primary hover:underline cursor-pointer bg-transparent border-none p-0 shrink-0',

  // Empty / no results
  emptyState:   'py-10 text-center',
  emptyIcon:    'material-symbols-outlined text-[40px] text-ink-dim',
  emptyText:    'font-mono text-[11px] text-ink-dim mt-3 uppercase tracking-wide',
  noResults:    'py-6 text-center font-mono text-[12px] text-ink-dim',

  // Skeleton
  skeleton:     'h-[44px] rounded-[6px] af-shimmer',
};
