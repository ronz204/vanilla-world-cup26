import { store }      from '@context/store.js';
import { component }  from '@context/component.js';
import { delegate }   from '@context/delegate.js';
import { html, raw }  from '@context/escape.js';
import { AuthError }  from '@shared/http/errors.js';
import { clearToken } from '@shared/http/auth.js';
import { api }        from './api.js';
import { w }          from './styles.js';

// ── Domain helpers ──────────────────────────────────────────────────────────────

function timeAgo(savedAt) {
  const mins = Math.floor((Date.now() - savedAt) / 60_000);
  if (mins < 1)  return 'hace menos de 1m';
  if (mins < 60) return `hace ${mins}m`;
  return `hace ${Math.floor(mins / 60)}h`;
}

function formatGameInfo(game) {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  if (!game.local_date) return '';
  const [datePart, timePart] = game.local_date.split(' ');
  const [m, d] = datePart.split('/');
  const date = `${d} ${months[Number(m) - 1]} · ${timePart}`;
  const roundMap = { group: 'Grupos', r32: 'R32', r16: 'Octavos', qf: 'Cuartos', sf: 'Semi', third: '3er Lugar', final: 'Final' };
  const round = roundMap[game.type] ?? game.type?.toUpperCase() ?? '';
  return `${date} · ${round}`;
}

function hasRealTeams(game) {
  return game.home_team_id !== '0' && game.away_team_id !== '0';
}

function isValidPred(pred) {
  return pred != null
      && pred.home !== '' && pred.away !== ''
      && !isNaN(Number(pred.home)) && !isNaN(Number(pred.away));
}

function evaluate(pred, game) {
  const ph = Number(pred.home), pa = Number(pred.away);
  const gh = Number(game.home_score), ga = Number(game.away_score);
  if (ph === gh && pa === ga) return 'exact';
  const predResult = ph > pa ? 'home' : ph < pa ? 'away' : 'draw';
  const gameResult = gh > ga ? 'home' : gh < ga ? 'away' : 'draw';
  return predResult === gameResult ? 'result' : 'miss';
}

function filterGames(games, query) {
  if (query.length < 2) return games;
  const q = query.toLowerCase();
  return games.filter(g =>
    g.home_team_name_en?.toLowerCase().includes(q) ||
    g.away_team_name_en?.toLowerCase().includes(q)
  );
}

// ── Status Pill ─────────────────────────────────────────────────────────────────

function renderPill({ gamesStatus, retryIn }) {
  if (retryIn !== null) {
    return html`
      <div class="${w.pill} ${w.pillRetry}">
        <span class="material-symbols-outlined text-[14px]">sync</span>
        <span>Reintentando en ${retryIn}s</span>
      </div>`;
  }
  const variants = {
    loading: [w.pillLoading, 'Cargando...'],
    stale:   [w.pillStale,   'Datos guardados'],
    error:   [w.pillError,   'Sin conexión'],
    ok:      [w.pillOk,      'Actualizado'],
  };
  const [cls, label] = variants[gamesStatus] ?? variants.ok;
  return html`<div class="${w.pill} ${cls}"><span>${label}</span></div>`;
}

// ── Stub ────────────────────────────────────────────────────────────────────────

function renderStub(state) {
  const { predictions, gamesStatus, retryIn } = state;
  const predCount = Object.values(predictions).filter(p => p?.home !== '' && p?.away !== '').length;
  return html`
    <div class="${w.stub}">
      <div class="${w.stubLeft}">
        <span class="${w.stubTag}">Quiniela</span>
        <span class="${w.stubLabel}">Predicciones de Partido</span>
      </div>
      <div class="${w.stubRight}">
        <span class="${w.countBadge}">${predCount} predicción${predCount !== 1 ? 'es' : ''}</span>
        ${raw(renderPill({ gamesStatus, retryIn }))}
      </div>
    </div>`;
}

// ── Pending tab ─────────────────────────────────────────────────────────────────

function renderPendingRow(game, pred, teamById) {
  const homeTeam = teamById.get(game.home_team_id);
  const awayTeam = teamById.get(game.away_team_id);
  const hasPred  = pred?.home !== '' || pred?.away !== '';
  const homeFlag = homeTeam ? html`<img src="${homeTeam.flag}" alt="" class="${w.teamFlag}" loading="lazy">` : '';
  const awayFlag = awayTeam ? html`<img src="${awayTeam.flag}" alt="" class="${w.teamFlag}" loading="lazy">` : '';

  return html`
    <div class="${w.gameRow}">
      <span class="${w.gameInfo}">${formatGameInfo(game)}</span>
      <div class="${w.teamSection}">
        ${raw(homeFlag)}
        <span class="${w.teamName}">${game.home_team_name_en ?? '?'}</span>
      </div>
      <div class="${w.predWrap}">
        <input
          type="text"
          inputmode="numeric"
          maxlength="2"
          data-ql-home="${game.id}"
          value="${pred?.home ?? ''}"
          class="${w.predInput}"
          placeholder="—"
          aria-label="Goles local"
        >
        <span class="${w.predSep}">:</span>
        <input
          type="text"
          inputmode="numeric"
          maxlength="2"
          data-ql-away="${game.id}"
          value="${pred?.away ?? ''}"
          class="${w.predInput}"
          placeholder="—"
          aria-label="Goles visitante"
        >
      </div>
      <div class="${w.teamSectionR}">
        ${raw(awayFlag)}
        <span class="${w.teamName}">${game.away_team_name_en ?? '?'}</span>
      </div>
      <span class="${w.savedBadge}" aria-hidden="true">${hasPred ? '✓' : ''}</span>
    </div>`;
}

function renderPendingTab(state, teamById) {
  const { games, gamesStatus, search, predictions } = state;

  if (gamesStatus === 'loading' && games.length === 0) {
    return Array.from({ length: 7 }, () => `<div class="${w.skeleton}"></div>`).join('');
  }

  const pending  = games.filter(g => g.finished === 'FALSE' && hasRealTeams(g));
  const filtered = filterGames(pending, search);

  if (pending.length === 0 && games.length > 0) {
    return `
      <div class="${w.emptyState}">
        <span class="${w.emptyIcon}">sports_score</span>
        <p class="${w.emptyText}">Todos los partidos han concluido.</p>
      </div>`;
  }

  if (filtered.length === 0 && search.length >= 2) {
    return `
      <div class="${w.emptyState}">
        <span class="${w.emptyIcon}">search_off</span>
        <p class="${w.emptyText}">Sin resultados para "${search}"</p>
      </div>`;
  }

  return `<div class="${w.gameList}">${filtered.map(g => renderPendingRow(g, predictions[g.id], teamById)).join('')}</div>`;
}

// ── Results tab ─────────────────────────────────────────────────────────────────

function renderStatsBar(games, predictions) {
  let exact = 0, result = 0, miss = 0;
  for (const g of games) {
    if (g.finished !== 'TRUE') continue;
    const pred = predictions[g.id];
    if (!isValidPred(pred)) continue;
    const outcome = evaluate(pred, g);
    if (outcome === 'exact')        exact++;
    else if (outcome === 'result')  result++;
    else                            miss++;
  }
  const total = exact + result + miss;
  return html`
    <div class="${w.statsBar}">
      <div class="${w.statItem}">
        <span class="${w.statValueExact}">${exact}</span>
        <span class="${w.statLabel}">Exacto</span>
      </div>
      <div class="${w.statDivider}"></div>
      <div class="${w.statItem}">
        <span class="${w.statValueResult}">${result}</span>
        <span class="${w.statLabel}">Resultado</span>
      </div>
      <div class="${w.statDivider}"></div>
      <div class="${w.statItem}">
        <span class="${w.statValueMiss}">${miss}</span>
        <span class="${w.statLabel}">Fallo</span>
      </div>
      <div class="${w.statDivider}"></div>
      <div class="${w.statItem}">
        <span class="${w.statValueTotal}">${total}</span>
        <span class="${w.statLabel}">Total</span>
      </div>
    </div>`;
}

function renderResultRow(game, pred, teamById) {
  const homeTeam = teamById.get(game.home_team_id);
  const awayTeam = teamById.get(game.away_team_id);
  const outcome  = evaluate(pred, game);
  const homeFlag = homeTeam ? html`<img src="${homeTeam.flag}" alt="" class="${w.teamFlag}" loading="lazy">` : '';
  const awayFlag = awayTeam ? html`<img src="${awayTeam.flag}" alt="" class="${w.teamFlag}" loading="lazy">` : '';

  const rowExtra = outcome === 'exact' ? w.gameRowExact : outcome === 'result' ? w.gameRowResult : w.gameRowMiss;
  const chip     = outcome === 'exact'
    ? html`<span class="${w.chipExact}">Exacto</span>`
    : outcome === 'result'
      ? html`<span class="${w.chipResult}">Resultado</span>`
      : html`<span class="${w.chipMiss}">Fallo</span>`;

  return html`
    <div class="${w.gameRow} ${rowExtra}">
      <div class="${w.teamSection}">
        ${raw(homeFlag)}
        <span class="${w.teamName}">${game.home_team_name_en ?? '?'}</span>
      </div>
      <div class="${w.scoreWrap}">
        <span class="${w.scoreActual}">${game.home_score} – ${game.away_score}</span>
        <span class="${w.scorePred}">pred: ${pred.home} – ${pred.away}</span>
      </div>
      <div class="${w.teamSectionR}">
        ${raw(awayFlag)}
        <span class="${w.teamName}">${game.away_team_name_en ?? '?'}</span>
      </div>
      ${raw(chip)}
    </div>`;
}

function renderResultsTab(state, teamById) {
  const { games, predictions, search } = state;

  const finished = games.filter(g => g.finished === 'TRUE' && hasRealTeams(g) && isValidPred(predictions[g.id]));
  const filtered = filterGames(finished, search);

  const statsBar = renderStatsBar(games, predictions);

  if (finished.length === 0) {
    return `
      ${statsBar}
      <div class="${w.emptyState}">
        <span class="${w.emptyIcon}">ballot</span>
        <p class="${w.emptyText}">Sin partidos concluidos con tus predicciones aún.</p>
      </div>`;
  }

  const listHtml = filtered.length
    ? filtered.map(g => renderResultRow(g, predictions[g.id], teamById)).join('')
    : `<div class="${w.emptyState}">
        <span class="${w.emptyIcon}">search_off</span>
        <p class="${w.emptyText}">Sin coincidencias para "${search}"</p>
       </div>`;

  return `${statsBar}<div class="${w.gameList}">${listHtml}</div>`;
}

// ── Root render ──────────────────────────────────────────────────────────────────

function render(state) {
  const { gamesStatus, gamesSavedAt, search, activeTab } = state;
  const teamById = new Map(state.allTeams.map(t => [t.id, t]));

  const staleBanner = gamesStatus === 'stale' && gamesSavedAt
    ? `<div class="${w.staleBanner}">
        <span class="material-symbols-outlined text-[14px] shrink-0 text-stale">info</span>
        <span class="${w.staleBannerText}">Datos guardados · ${timeAgo(gamesSavedAt)}</span>
       </div>`
    : '';

  const errorBanner = gamesStatus === 'error'
    ? `<div class="${w.errorBanner}">
        <span class="${w.errorText}">No se pudo conectar. Mostrando datos guardados.</span>
        <button data-ql-retry class="${w.retryBtn}">Reintentar</button>
       </div>`
    : '';

  const tabContent = activeTab === 'pending'
    ? renderPendingTab(state, teamById)
    : renderResultsTab(state, teamById);

  return html`
    <div class="${w.page}">
      <div class="${w.card}">
        <div class="${w.notchL}" aria-hidden="true"></div>
        <div class="${w.notchR}" aria-hidden="true"></div>
        ${raw(renderStub(state))}
        <div class="${w.perf}"></div>
        <div class="${w.body}">
          <div class="${w.tabBar}">
            <button
              data-ql-tab="pending"
              class="${w.tab} ${activeTab === 'pending' ? w.tabActive : w.tabInactive}"
            >Por jugar</button>
            <button
              data-ql-tab="results"
              class="${w.tab} ${activeTab === 'results' ? w.tabActive : w.tabInactive}"
            >Resultados</button>
          </div>
          ${raw(staleBanner)}
          ${raw(errorBanner)}
          <div class="${w.searchWrap}">
            <span class="${w.searchIcon}">search</span>
            <input
              id="ql-search"
              type="text"
              placeholder="Buscar equipo..."
              value="${search}"
              class="${w.searchInput}"
              autocomplete="off"
            >
          </div>
          ${raw(tabContent)}
        </div>
      </div>
    </div>`;
}

// ── Data loading ─────────────────────────────────────────────────────────────────

async function loadData(state) {
  const onRetryTick = s => state.set({ retryIn: s });

  const [teamsResult, gamesResult] = await Promise.allSettled([
    api.fetchAllTeams(),
    api.fetchGames(onRetryTick),
  ]);

  if (teamsResult.status === 'fulfilled') {
    state.set({ allTeams: teamsResult.value, teamsStatus: 'ok' });
  } else {
    if (teamsResult.reason instanceof AuthError) { clearToken(); location.hash = '/'; return; }
    const cached = api.teamsFromCache();
    state.set(cached
      ? { allTeams: cached.data, teamsStatus: 'stale' }
      : { teamsStatus: 'error' }
    );
  }

  if (gamesResult.status === 'fulfilled') {
    state.set({ games: gamesResult.value, gamesStatus: 'ok', retryIn: null });
  } else {
    if (gamesResult.reason instanceof AuthError) { clearToken(); location.hash = '/'; return; }
    state.set({ retryIn: null });
    const cached = api.gamesFromCache();
    state.set(cached
      ? { games: cached.data, gamesStatus: 'stale', gamesSavedAt: cached.savedAt }
      : { gamesStatus: 'error' }
    );
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────────

export function renderQuiniela(outlet) {
  const state = store({
    games:        [],
    allTeams:     [],
    gamesStatus:  'loading',
    teamsStatus:  'loading',
    gamesSavedAt: null,
    retryIn:      null,
    predictions:  api.loadPredictions(),  // carga sincrónica desde localStorage
    activeTab:    'pending',
    search:       '',
  });

  component(outlet, state, render);

  const off = [
    delegate(outlet, 'click', '[data-ql-tab]', (_, t) =>
      state.set({ activeTab: t.dataset.qlTab })
    ),

    delegate(outlet, 'input', '#ql-search', (_, t) =>
      state.set({ search: t.value })
    ),

    delegate(outlet, 'input', '[data-ql-home]', (_, t) => {
      const gameId = t.dataset.qlHome;
      state.update(s => {
        const pred  = { ...(s.predictions[gameId] ?? {}), home: t.value };
        const preds = { ...s.predictions, [gameId]: pred };
        api.savePredictions(preds);
        return { predictions: preds };
      });
    }),

    delegate(outlet, 'input', '[data-ql-away]', (_, t) => {
      const gameId = t.dataset.qlAway;
      state.update(s => {
        const pred  = { ...(s.predictions[gameId] ?? {}), away: t.value };
        const preds = { ...s.predictions, [gameId]: pred };
        api.savePredictions(preds);
        return { predictions: preds };
      });
    }),

    delegate(outlet, 'click', '[data-ql-retry]', () => {
      state.set({ gamesStatus: 'loading', teamsStatus: 'loading', retryIn: null });
      loadData(state);
    }),
  ];

  loadData(state);

  return () => {
    state.destroy();
    off.forEach(c => c());
  };
}
