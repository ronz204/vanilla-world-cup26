import { store }     from '@context/store.js';
import { component } from '@context/component.js';
import { delegate }  from '@context/delegate.js';
import { html, raw } from '@context/escape.js';
import { AuthError } from '@shared/http/errors.js';
import { clearToken } from '@shared/http/auth.js';
import { timeAgo }   from '@shared/utils.js';
import { api }                              from './api.js';
import { w }                               from './styles.js';
import { getRelevantGame, getMatchStatus } from './match.js';

// ── Domain helpers ─────────────────────────────────────────────────────────────

function staleBadge(savedAt) {
  return `<span class="${w.stalePill}">Guardado · ${timeAgo(savedAt)}</span>`;
}

function filterTeams(allTeams, query) {
  if (query.length < 2) return allTeams;
  const q = query.toLowerCase();
  return allTeams.filter(t =>
    t.name_en?.toLowerCase().includes(q) ||
    t.fifa_code?.toLowerCase().includes(q)
  );
}

// ── Status Pill ────────────────────────────────────────────────────────────────

function renderPill({ gamesStatus, retryIn }) {
  if (retryIn !== null) {
    return html`
      <div class="${w.pill} ${w.pillRetry}">
        <span class="material-symbols-outlined text-[14px]">sync</span>
        <span>Reintentando en ${retryIn}s</span>
      </div>`;
  }
  if (gamesStatus === 'loading') {
    return html`<div class="${w.pill} ${w.pillLoading}"><span>Cargando...</span></div>`;
  }
  if (gamesStatus === 'error') {
    return html`<div class="${w.pill} ${w.pillError}"><span>Sin conexión</span></div>`;
  }
  if (gamesStatus === 'stale') {
    return html`<div class="${w.pill} ${w.pillStale}"><span>Datos guardados</span></div>`;
  }
  return html`
    <div class="${w.pill} ${w.pillLive}" role="status" aria-label="Polling activo">
      <div class="${w.pillDot}" aria-hidden="true"></div>
      <span>En vivo</span>
    </div>`;
}

// ── Stub ───────────────────────────────────────────────────────────────────────

function renderStub(state) {
  const { favorites, pollInterval } = state;
  return html`
    <div class="${w.stub}">
      <div class="${w.stubLeft}">
        <span class="${w.stubTag}">Sorpresas</span>
        <span class="${w.stubLabel}">Seguidor de Favoritos</span>
      </div>
      <div class="${w.stubRight}">
        <select data-lk-interval class="${w.intervalSelect}" aria-label="Intervalo de actualización">
          <option value="15" ${pollInterval === 15 ? 'selected' : ''}>Cada 15s</option>
          <option value="30" ${pollInterval === 30 ? 'selected' : ''}>Cada 30s</option>
          <option value="60" ${pollInterval === 60 ? 'selected' : ''}>Cada 60s</option>
        </select>
        <span class="${w.countBadge}">${favorites.length} favorito${favorites.length !== 1 ? 's' : ''}</span>
        ${raw(renderPill(state))}
      </div>
    </div>`;
}

// ── Left panel — available teams ───────────────────────────────────────────────

function renderSkeletons() {
  return Array.from({ length: 7 }, () => `<div class="${w.skeleton}"></div>`).join('');
}

function renderPanelHead(title) {
  return `<div class="${w.panelHead}"><h3 class="${w.panelTitle}">${title}</h3></div>`;
}

function renderTeamRow(team, isFav) {
  return html`
    <div class="${w.row} ${isFav ? w.rowFav : ''}">
      <div class="${w.rowLeft}">
        <img src="${team.flag}" alt="${team.name_en}" class="${w.teamFlag}" loading="lazy" />
        <span class="${w.teamName}">${team.name_en}</span>
        <span class="${w.teamCode}">${team.fifa_code}</span>
      </div>
      <button
        data-lk-fav="${team.id}"
        class="${w.starBtn} ${isFav ? w.starBtnActive : ''}"
        ${isFav ? 'disabled' : ''}
        aria-label="${isFav ? 'Ya es favorito' : 'Agregar a favoritos'}"
      >
        <span class="material-symbols-outlined text-[16px]">${isFav ? 'star' : 'star_border'}</span>
      </button>
    </div>`;
}

function renderLeftPanel(state) {
  const { allTeams, teamsStatus, favorites, search } = state;

  if (teamsStatus === 'loading') {
    return `
      ${renderPanelHead('Equipos')}
      <div class="flex flex-col gap-1.5">${renderSkeletons()}</div>`;
  }
  if (teamsStatus === 'error') {
    return `
      ${renderPanelHead('Equipos')}
      <div class="${w.errorBanner}">
        <span class="${w.errorText}">No se pudo cargar la lista de equipos.</span>
      </div>`;
  }

  const filtered  = filterTeams(allTeams, search);
  const listHtml  = filtered.length
    ? filtered.map(t => renderTeamRow(t, favorites.includes(t.id))).join('')
    : html`<p class="${w.noResults}">Sin resultados para "${search}"</p>`;

  return html`
    ${raw(renderPanelHead('Equipos'))}
    <div class="${w.searchWrap}">
      <span class="${w.searchIcon}">search</span>
      <input
        id="lk-search"
        type="text"
        placeholder="Nombre o código FIFA..."
        value="${search}"
        class="${w.searchInput}"
        autocomplete="off"
      />
    </div>
    <div class="${w.scrollList}">${raw(listHtml)}</div>`;
}

// ── Right panel — favorites dashboard ─────────────────────────────────────────

function renderMatchBadge(status) {
  if (!status) return `<span class="${w.noMatch}">Sin partidos aún</span>`;

  const score = `${status.myScore} – ${status.theirScore}`;

  if (status.losing && status.live) {
    return `<span class="${w.scoreLosing} animate-pulse">${score}</span>
            <span class="${w.tagLive}">En vivo</span>`;
  }
  if (status.losing) {
    return `<span class="${w.scoreLosing}">${score}</span>
            <span class="${w.tagFinished}">Final</span>`;
  }
  return `<span class="${status.winning ? w.scoreWinning : w.scoreDraw}">${score}</span>
          <span class="${status.live ? w.tagLive : w.tagFinished}">${status.live ? 'En vivo' : 'Final'}</span>`;
}

function renderFavRow(team, status) {
  const rowExtra = status?.losing
    ? (status.live ? w.rowLosingLive : w.rowLosing)
    : '';

  return html`
    <div class="${w.row} ${rowExtra}">
      <div class="${w.rowLeft}">
        <img src="${team.flag}" alt="${team.name_en}" class="${w.teamFlag}" loading="lazy" />
        <span class="${w.teamName}">${team.name_en}</span>
      </div>
      <div class="${w.rowRight}">
        ${raw(renderMatchBadge(status))}
        <button
          data-lk-remove="${team.id}"
          class="${w.removeBtn}"
          aria-label="Quitar ${team.name_en} de favoritos"
        >
          <span class="${w.removeBtnIcon}">remove</span>
        </button>
      </div>
    </div>`;
}

function renderRightPanel(state) {
  const { favorites, allTeams, teamsStatus, games, gamesStatus, gamesSavedAt } = state;

  const teamById = new Map(allTeams.map(t => [t.id, t]));

  const panelHead = renderPanelHead('Mis Favoritos');

  const staleBar = gamesStatus === 'stale' && gamesSavedAt
    ? `<div class="${w.staleBanner}">${staleBadge(gamesSavedAt)}</div>`
    : '';

  const errorBar = gamesStatus === 'error'
    ? `<div class="${w.errorBanner}">
        <span class="${w.errorText}">No se pudo obtener resultados. Usando último registro.</span>
        <button data-lk-retry class="${w.retryBtn}">Reintentar</button>
       </div>`
    : '';

  let listHtml;
  if (favorites.length === 0) {
    listHtml = `
      <div class="${w.emptyState}">
        <span class="${w.emptyIcon}">notifications</span>
        <p class="${w.emptyText}">Marcá un equipo con ★ para seguirlo.</p>
      </div>`;
  } else if (teamsStatus === 'loading') {
    listHtml = Array.from({ length: favorites.length }, () => `<div class="${w.skeleton}"></div>`).join('');
  } else {
    listHtml = favorites.map(id => {
      const team = teamById.get(id);
      if (!team) return '';
      const game   = getRelevantGame(id, games);
      const status = getMatchStatus(id, game);
      return renderFavRow(team, status);
    }).join('');
  }

  return `
    ${panelHead}
    ${staleBar}
    ${errorBar}
    <div class="${w.scrollList}">${listHtml}</div>`;
}

// ── Root render ────────────────────────────────────────────────────────────────

function render(state) {
  return html`
    <div class="${w.page}">
      <div class="${w.card}">
        <div class="${w.notchL}" aria-hidden="true"></div>
        <div class="${w.notchR}" aria-hidden="true"></div>
        ${raw(renderStub(state))}
        <div class="${w.perf}"></div>
        <div class="${w.body}">
          <div class="${w.grid}">
            <div class="${w.panel} ${w.panelL}">
              ${raw(renderLeftPanel(state))}
            </div>
            <div class="${w.panel} ${w.panelR}">
              ${raw(renderRightPanel(state))}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Data / polling ─────────────────────────────────────────────────────────────

async function loadTeams(state) {
  try {
    const teams = await api.fetchAllTeams();
    state.set({ allTeams: teams, teamsStatus: 'ok' });
  } catch (err) {
    if (err instanceof AuthError) { clearToken(); location.hash = '/'; return; }
    const cached = api.teamsFromCache();
    state.set(cached
      ? { allTeams: cached.data, teamsStatus: 'stale' }
      : { teamsStatus: 'error' }
    );
  }
}

async function fetchAndUpdateGames(state, skipCache = false) {
  const onRetryTick = s => state.set({ retryIn: s });
  try {
    const games = await api.fetchGames(onRetryTick, skipCache);
    state.set({ games, gamesStatus: 'ok', gamesSavedAt: null, retryIn: null });
  } catch (err) {
    if (err instanceof AuthError) { clearToken(); location.hash = '/'; return; }
    state.set({ retryIn: null });
    const cached = api.gamesFromCache();
    if (cached) {
      // Fallback a caché de localStorage
      state.set({ games: cached.data, gamesStatus: 'stale', gamesSavedAt: cached.savedAt });
    } else if (state.get().games.length > 0) {
      // Mantener datos en memoria — nunca resetear a [] por un fallo de red
      state.set({ gamesStatus: 'stale' });
    } else {
      state.set({ gamesStatus: 'error' });
    }
  }
}

// ── View entry point ───────────────────────────────────────────────────────────

export function renderTracker(outlet) {
  const state = store({
    allTeams:     [],
    teamsStatus:  'loading',
    favorites:    api.loadFavorites(),   // carga sincrónica desde localStorage
    games:        [],
    gamesStatus:  'loading',
    gamesSavedAt: null,
    retryIn:      null,
    pollInterval: 30,
    search:       '',
  });

  let pollTimer = null;

  const startPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(
      () => fetchAndUpdateGames(state, true),
      state.get().pollInterval * 1_000
    );
  };

  component(outlet, state, render);

  const off = [
    delegate(outlet, 'input', '#lk-search', (_, t) =>
      state.set({ search: t.value })
    ),

    delegate(outlet, 'change', '[data-lk-interval]', (_, t) => {
      state.set({ pollInterval: Number(t.value) });
      startPolling();
    }),

    delegate(outlet, 'click', '[data-lk-fav]', (_, t) => {
      const id = t.dataset.lkFav;
      state.update(s => {
        if (s.favorites.includes(id)) return {};
        const favs = [...s.favorites, id];
        api.saveFavorites(favs);
        return { favorites: favs };
      });
    }),

    delegate(outlet, 'click', '[data-lk-remove]', (_, t) => {
      const id = t.dataset.lkRemove;
      state.update(s => {
        const favs = s.favorites.filter(f => f !== id);
        api.saveFavorites(favs);
        return { favorites: favs };
      });
    }),

    delegate(outlet, 'click', '[data-lk-retry]', () => {
      state.set({ gamesStatus: 'loading' });
      fetchAndUpdateGames(state, true);
    }),
  ];

  loadTeams(state);
  fetchAndUpdateGames(state);  // carga inicial: usa caché si está fresca
  startPolling();              // ticks periódicos: siempre frescos (skipCache=true)

  return () => {
    state.destroy();
    if (pollTimer) clearInterval(pollTimer);
    off.forEach(c => c());
  };
}
