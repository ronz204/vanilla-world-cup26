import { store }     from '@context/store.js';
import { component } from '@context/component.js';
import { delegate }  from '@context/delegate.js';
import { html, raw } from '@context/escape.js';
import { cache }     from '@shared/http/cache.js';
import { AuthError } from '@shared/http/errors.js';
import { clearToken } from '@shared/http/auth.js';
import { api }       from './api.js';
import { calcGoals, totalGoals } from './goals.js';
import { w }         from './styles.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(savedAt) {
  const mins = Math.floor((Date.now() - savedAt) / 60_000);
  if (mins < 1)  return 'hace menos de 1m';
  if (mins < 60) return `hace ${mins}m`;
  return `hace ${Math.floor(mins / 60)}h`;
}

function staleBadge(endpoint) {
  const entry = cache.get(endpoint);
  const time  = entry ? timeAgo(entry.savedAt) : '';
  return `<span class="${w.panelStaleBadge}">Guardado${time ? ' · ' + time : ''}</span>`;
}

// ── Status Pill ───────────────────────────────────────────────────────────────

function renderPill({ teamsStatus, gamesStatus, retryIn }) {
  if (retryIn !== null) {
    return html`
      <div class="${w.pill} ${w.pillRetry}">
        <span class="material-symbols-outlined text-[14px]">sync</span>
        <span>Reintentando en ${retryIn}s</span>
      </div>`;
  }
  const loading = teamsStatus === 'loading' || gamesStatus === 'loading';
  const error   = teamsStatus === 'error'   || gamesStatus === 'error';
  const stale   = (teamsStatus === 'stale'  || gamesStatus === 'stale') && !error;

  if (loading) return html`<div class="${w.pill} ${w.pillLoading}"><span>Cargando...</span></div>`;
  if (error)   return html`<div class="${w.pill} ${w.pillError}"><span>Sin datos</span></div>`;
  if (stale)   return html`<div class="${w.pill} ${w.pillStale}"><span>Datos guardados</span></div>`;
  return html`
    <div class="${w.pill} ${w.pillLive}" role="status" aria-label="Datos en vivo">
      <div class="${w.pillDot}" aria-hidden="true"></div>
      <span>En vivo</span>
    </div>`;
}

// ── Stub ──────────────────────────────────────────────────────────────────────

function renderStub(state) {
  return html`
    <div class="${w.stub}">
      <div class="${w.stubLeft}">
        <span class="${w.stubTag}">Dream Team</span>
        <span class="${w.stubLabel}">Selección Mundial 2026</span>
      </div>
      <span class="${w.countBadge}">${state.selected.length} / 11</span>
      ${raw(renderPill(state))}
    </div>`;
}

// ── Left panel — available teams ──────────────────────────────────────────────

function renderSkeletons() {
  return Array.from({ length: 7 }, () => `<div class="${w.skeleton}"></div>`).join('');
}

function renderTeamRow(team, isSelected, isDisabled) {
  const rowCls = isSelected ? `${w.teamRow} ${w.teamRowSelected}` : w.teamRow;
  return html`
    <div class="${rowCls}">
      <div class="${w.teamLeft}">
        <img src="${team.flag}" alt="${team.name_en}" class="${w.teamFlag}" loading="lazy" />
        <span class="${w.teamName}">${team.name_en}</span>
        <span class="${w.teamCode}">${team.fifa_code}</span>
      </div>
      <button
        data-dt-add="${team.id}"
        class="${w.addBtn}"
        ${isSelected || isDisabled ? 'disabled' : ''}
        aria-label="Agregar ${team.name_en} al Dream Team"
      >${isSelected ? '✓' : '+'}</button>
    </div>`;
}

function renderAvailablePanel(state) {
  const { allTeams, selected, search, teamsStatus } = state;

  if (teamsStatus === 'loading') {
    return html`
      <div class="${w.panelHead}">
        <h3 class="${w.panelTitle}">Equipos disponibles</h3>
      </div>
      <div class="flex flex-col gap-1.5">${raw(renderSkeletons())}</div>`;
  }

  if (teamsStatus === 'error') {
    return html`
      <div class="${w.panelHead}">
        <h3 class="${w.panelTitle}">Equipos disponibles</h3>
      </div>
      <div class="${w.errorBanner}">
        <span class="${w.errorText}">No se pudo cargar la lista de equipos.</span>
        <button data-dt-retry class="${w.retryBtn}">Reintentar</button>
      </div>`;
  }

  const isAtLimit = selected.length >= 11;
  const q         = search.toLowerCase().trim();
  const filtered  = q
    ? allTeams.filter(t =>
        t.name_en.toLowerCase().includes(q) ||
        t.fifa_code.toLowerCase().includes(q)
      )
    : allTeams;

  const listContent = filtered.length > 0
    ? filtered.map(t => renderTeamRow(t, selected.includes(t.id), isAtLimit)).join('')
    : q
      ? html`<p class="${w.noResults}">Sin resultados para "${search}"</p>`
      : `<p class="${w.noResults}">No hay equipos disponibles.</p>`;

  return html`
    <div class="${w.panelHead}">
      <h3 class="${w.panelTitle}">Equipos disponibles</h3>
      ${teamsStatus === 'stale' ? raw(staleBadge('/get/teams')) : ''}
    </div>
    <div class="${w.searchWrap}">
      <span class="${w.searchIcon}">search</span>
      <input
        id="dt-search"
        type="text"
        placeholder="Nombre o código FIFA..."
        value="${search}"
        class="${w.searchInput}"
        autocomplete="off"
      />
    </div>
    ${isAtLimit ? raw(`<div class="${w.limitBanner}">Límite de 11 equipos alcanzado.</div>`) : ''}
    <div class="${w.teamList}">${raw(listContent)}</div>`;
}

// ── Right panel — Dream Team ──────────────────────────────────────────────────

function renderGoalsBadge(team, allGames, gamesStatus) {
  if (gamesStatus !== 'ok' && gamesStatus !== 'stale') {
    return html`<span class="${w.pendingBadge}">Pendiente</span>`;
  }
  const goals = calcGoals(team.id, allGames);
  return html`
    <span class="${w.goalsBadge}">
      ${goals} <span class="${w.goalsUnit}">goles</span>
    </span>`;
}

function renderSelectedRow(team, state) {
  return html`
    <div class="${w.selectedRow}">
      <div class="${w.selectedLeft}">
        <img src="${team.flag}" alt="${team.name_en}" class="${w.teamFlag}" loading="lazy" />
        <span class="${w.teamName}">${team.name_en}</span>
      </div>
      <div class="${w.selectedRight}">
        ${raw(renderGoalsBadge(team, state.allGames, state.gamesStatus))}
        <button
          data-dt-remove="${team.id}"
          class="${w.removeBtn}"
          aria-label="Quitar ${team.name_en} del Dream Team"
        >
          <span class="${w.removeBtnIcon}">remove</span>
        </button>
      </div>
    </div>`;
}

function renderDreamPanel(state) {
  const { selected, allTeams, gamesStatus } = state;
  const selectedTeams = selected
    .map(id => allTeams.find(t => t.id === id))
    .filter(Boolean);

  return html`
    <div class="${w.panelHead}">
      <h3 class="${w.panelTitle}">Mi Dream Team</h3>
      ${gamesStatus === 'stale' ? raw(staleBadge('/get/games')) : ''}
    </div>
    ${gamesStatus === 'error' ? raw(`
      <div class="${w.gamesWarn}">
        <span class="${w.gamesWarnText}">No se pudieron cargar los goles.</span>
        <button data-dt-retry class="${w.retryBtn}">Reintentar</button>
      </div>`) : ''}
    <div class="${w.selectedList}">
      ${selected.length === 0
        ? raw(`
          <div class="${w.emptyState}">
            <span class="${w.emptyIcon}">group</span>
            <p class="${w.emptyText}">Elegí tu primer equipo para arrancar.</p>
          </div>`)
        : raw(selectedTeams.map(t => renderSelectedRow(t, state)).join(''))
      }
    </div>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function renderFooter(state) {
  const { selected, allGames, gamesStatus } = state;
  const total = totalGoals(selected, allGames, gamesStatus);

  return html`
    <div class="${w.footerPerf}"></div>
    <div class="${w.footerStrip}">
      <span class="${w.footerLabel}">Total Goles</span>
      <div class="${w.footerRight}">
        ${gamesStatus === 'stale' ? raw(`<span class="${w.footerStaleBadge}">Datos guardados</span>`) : ''}
        ${total !== null
          ? raw(`<span class="${w.footerTotal}">${total}</span>`)
          : raw(`<span class="${w.footerDash}">—</span>`)
        }
      </div>
    </div>`;
}

// ── Root render ───────────────────────────────────────────────────────────────

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
              ${raw(renderAvailablePanel(state))}
            </div>
            <div class="${w.panel} ${w.panelR}">
              ${raw(renderDreamPanel(state))}
            </div>
          </div>
        </div>
        ${raw(renderFooter(state))}
      </div>
    </div>`;
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadData(state) {
  const onRetryTick = s => state.set({ retryIn: s });

  const [teamsResult, gamesResult] = await Promise.allSettled([
    api.fetchTeams(),
    api.fetchGames(onRetryTick),
  ]);

  const authErr = [teamsResult, gamesResult].find(
    r => r.status === 'rejected' && r.reason instanceof AuthError
  );
  if (authErr) { clearToken(); location.hash = '/'; return; }

  if (teamsResult.status === 'fulfilled') {
    state.set({ allTeams: teamsResult.value, teamsStatus: 'ok' });
  } else {
    const teams = api.teamsFromCache();
    state.set(teams
      ? { allTeams: teams, teamsStatus: 'stale' }
      : { teamsStatus: 'error' }
    );
  }

  if (gamesResult.status === 'fulfilled') {
    state.set({ allGames: gamesResult.value, gamesStatus: 'ok', retryIn: null });
  } else {
    const games = api.gamesFromCache();
    state.set(games
      ? { allGames: games, gamesStatus: 'stale', retryIn: null }
      : { gamesStatus: 'error', retryIn: null }
    );
  }
}

// ── View entry point ──────────────────────────────────────────────────────────

export function renderDreamTeam(outlet) {
  const state = store({
    teamsStatus: 'loading',
    gamesStatus: 'loading',
    retryIn:     null,
    allTeams:    [],
    allGames:    [],
    selected:    [],
    search:      '',
  });

  component(outlet, state, render);

  // Search: restore focus/cursor after re-render (innerHTML replacement loses focus)
  delegate(outlet, 'input', '#dt-search', (e, target) => {
    const val   = target.value;
    const start = target.selectionStart;
    const end   = target.selectionEnd;
    state.set({ search: val });
    const input = outlet.querySelector('#dt-search');
    if (input) { input.focus(); input.setSelectionRange(start, end); }
  });

  delegate(outlet, 'click', '[data-dt-add]', (_, target) => {
    const { selected } = state.get();
    if (selected.length >= 11) return;
    const id = target.dataset.dtAdd;
    if (selected.includes(id)) return;
    state.set({ selected: [...selected, id] });
  });

  delegate(outlet, 'click', '[data-dt-remove]', (_, target) => {
    const id = target.dataset.dtRemove;
    state.set({ selected: state.get().selected.filter(s => s !== id) });
  });

  delegate(outlet, 'click', '[data-dt-retry]', () => {
    state.set({ teamsStatus: 'loading', gamesStatus: 'loading', retryIn: null });
    loadData(state);
  });

  loadData(state);

  return () => state.destroy();
}
