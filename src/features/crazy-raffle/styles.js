export const w = {
  // Page / card
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

  // Repeat button
  repeatBtn:    'flex items-center gap-1.5 font-mono text-[11px] font-semibold px-3.5 py-2 rounded-[6px] bg-primary text-white hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed',
  repeatIcon:   'material-symbols-outlined text-[16px]',

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

  // Draw metadata bar
  drawMeta:     'flex items-center gap-2 mb-5',
  drawBadge:    'font-mono text-[10px] font-semibold text-ink-soft bg-surface-raised border border-border px-2.5 py-1 rounded-full',
  stalePill:    'font-mono text-[10px] text-stale bg-stale/10 border border-stale/20 px-2 py-0.5 rounded-full',

  // Group grid
  grid:         'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3',

  // Group card (mini ticket)
  groupCard:    'bg-surface border border-border rounded-[8px] overflow-hidden',
  groupStub:    'px-3 py-2 bg-surface-raised flex items-center justify-between gap-1',
  groupLabel:   'font-mono text-[10px] font-semibold text-ink-soft tracking-widest uppercase',
  groupNum:     'font-mono text-[10px] font-bold text-ink',
  groupPerf:    'af-perf h-px opacity-40',
  teamList:     'divide-y divide-border',
  teamRow:      'px-3 py-[7px] flex items-center gap-2',
  teamFlag:     'w-5 h-[14px] object-cover rounded-sm shrink-0',
  teamName:     'text-[12px] font-medium text-ink truncate',
  teamCode:     'ml-auto font-mono text-[10px] text-ink-dim shrink-0',

  // Skeleton card
  skeletonCard: 'rounded-[8px] af-shimmer h-[168px]',

  // Error / empty states
  emptyState:   'py-14 flex flex-col items-center gap-3',
  emptyIcon:    'material-symbols-outlined text-[44px] text-ink-dim',
  emptyText:    'font-mono text-[12px] text-danger text-center',
  retryBtn:     'font-mono text-[11px] font-semibold text-primary hover:underline cursor-pointer bg-transparent border-none p-0',
};
