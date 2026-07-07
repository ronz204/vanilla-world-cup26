export const w = {
  // Page wrapper
  page:         'px-4 md:px-6 py-6',
  card:         'af-ticket max-w-5xl mx-auto bg-surface rounded-[10px] border border-border overflow-visible relative',
  notchL:       'af-notch af-notch-l border-r border-border',
  notchR:       'af-notch af-notch-r border-l border-border',

  // Stub
  stub:         'flex items-center justify-between gap-3 px-6 py-4 bg-surface-raised',
  stubLeft:     'flex flex-col gap-0.5',
  stubTag:      'font-mono text-[10px] font-semibold tracking-widest text-ink-soft uppercase',
  stubLabel:    'font-display text-[14px] font-semibold text-ink',

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
  grid:         'grid grid-cols-1 md:grid-cols-2 gap-6',

  // Search inputs section
  searchSection:  'mb-6',
  searchRow:      'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4',
  searchLabel:    'font-mono text-[10px] font-semibold tracking-widest text-ink-soft uppercase mb-1.5 block',
  searchWrap:     'relative',
  searchIcon:     'absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-ink-dim pointer-events-none',
  searchInput:    'w-full bg-surface-raised border border-border rounded-[6px] py-2 pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-dim focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all',
  searchInputSel: 'w-full bg-primary/5 border border-primary/50 rounded-[6px] py-2 pl-9 pr-3 text-[13px] text-ink focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all',

  // Suggestions dropdown
  suggestions:    'absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-[6px] shadow-lg overflow-hidden',
  suggItem:       'flex items-center gap-2 px-3 py-2.5 hover:bg-surface-raised cursor-pointer transition-colors border-b border-border/50 last:border-b-0',
  suggFlag:       'w-7 h-5 object-cover rounded-sm shrink-0',
  suggName:       'text-[13px] font-medium text-ink truncate',
  suggCode:       'font-mono text-[10px] text-ink-dim shrink-0 ml-auto',
  suggEmpty:      'px-3 py-3 font-mono text-[11px] text-ink-dim',

  compareBtn:     'w-full md:w-auto px-6 py-2.5 bg-primary text-white font-bold text-[13px] rounded-[6px] hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed',
  resetBtn:       'font-mono text-[11px] text-ink-dim hover:text-danger cursor-pointer bg-transparent border-none p-0 transition-colors',

  // Team column
  column:         'flex flex-col gap-4',
  colHeader:      'flex items-center justify-between gap-2 pb-3 border-b border-border',
  colLabel:       'font-mono text-[10px] font-semibold tracking-widest text-ink-soft uppercase',

  // Team card
  teamCard:       'bg-surface-raised border border-border rounded-[6px] p-4',
  teamFlag:       'w-20 h-14 object-cover rounded-[6px] mx-auto block mb-3',
  teamName:       'font-display text-[18px] font-semibold text-ink text-center',
  teamCode:       'font-mono text-[11px] text-ink-dim text-center mb-4',
  teamStats:      'space-y-2',
  statRow:        'flex items-center justify-between gap-2',
  statLabel:      'font-mono text-[10px] text-ink-dim uppercase tracking-wide',
  statVal:        'font-mono text-[13px] font-semibold text-ink',
  statValGold:    'font-mono text-[13px] font-semibold text-gold',

  // Head-to-head match
  matchSection:   'mt-6',
  matchTitle:     'font-mono text-[10px] font-semibold tracking-widest text-ink-soft uppercase mb-3',
  matchCard:      'bg-surface-raised border border-border rounded-[6px] p-4',
  matchRow:       'flex items-center justify-between gap-3',
  matchTeam:      'flex flex-col items-center gap-1 flex-1',
  matchTeamName:  'font-mono text-[11px] text-ink-dim truncate max-w-[80px] text-center',
  matchScore:     'font-mono text-[28px] font-semibold text-gold leading-none',
  matchScoreSep:  'font-mono text-[20px] text-ink-dim',
  matchMeta:      'font-mono text-[10px] text-ink-dim text-center mt-2',

  // Error / empty
  errorBanner:    'px-3 py-3 rounded-[6px] bg-danger/5 border-l-2 border-danger',
  errorText:      'font-mono text-[12px] text-danger',
  emptyState:     'py-10 text-center',
  emptyIcon:      'material-symbols-outlined text-[40px] text-ink-dim',
  emptyText:      'font-mono text-[11px] text-ink-dim mt-3 uppercase tracking-wide',
  skeleton:       'h-[120px] rounded-[6px] af-shimmer',

  retryBtn:       'font-mono text-[11px] font-semibold text-primary hover:underline cursor-pointer bg-transparent border-none p-0 mt-2',
};
