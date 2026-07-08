import { api } from './api.js';
import { w } from './styles.js';

import { store } from '@context/store.js';
import { html, raw } from '@context/escape.js';
import { delegate } from '@context/delegate.js';
import { component } from '@context/component.js';

import { timeAgo } from '@shared/utils.js';
import { clearToken } from '@shared/http/auth.js';
import { AuthError } from '@shared/http/errors.js';
import { calcGoals, totalGoals } from './goals.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function staleBadge(savedAt) {
  return `<span class="${w.stalePill}">Guardado${savedAt ? ' · ' + timeAgo(savedAt) : ''}</span>`;
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

// ── Shared panel head (both panels) ──────────────────────────────────────────

function renderPanelHead(title, savedAt = null) {
  return html`
    <div class="${w.panelHead}">
      <h3 class="${w.panelTitle}">${title}</h3>
      ${savedAt ? raw(staleBadge(savedAt)) : ''}
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
  const rowCls = isSelected ? `${w.row} ${w.rowSelected}` : w.row;
  return html`
    <div class="${rowCls}">
      <div class="${w.rowLeft}">
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
  const { allTeams, selected, search, teamsStatus, teamsSavedAt } = state;

  if (teamsStatus === 'loading') {
    return html`
      ${raw(renderPanelHead('Equipos disponibles'))}
      <div class="flex flex-col gap-1.5">${raw(renderSkeletons())}</div>`;
  }

  if (teamsStatus === 'error') {
    return html`
      ${raw(renderPanelHead('Equipos disponibles'))}
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
    ${raw(renderPanelHead('Equipos disponibles', teamsStatus === 'stale' ? teamsSavedAt : null))}
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
    <div class="${w.scrollList}">${raw(listContent)}</div>`;
}

// ── Right panel — Dream Team ──────────────────────────────────────────────────

function renderGoalsBadge(team, allGames, gamesStatus) {
  if (gamesStatus !== 'ok' && gamesStatus !== 'stale') {
    return html`<span class="${w.stalePill}">Pendiente</span>`;
  }
  const goals = calcGoals(team.id, allGames);
  return html`
    <span class="${w.goalsBadge}">
      ${goals} <span class="${w.goalsUnit}">goles</span>
    </span>`;
}

function renderSelectedRow(team, allGames, gamesStatus) {
  return html`
    <div class="${w.row}">
      <div class="${w.rowLeft}">
        <img src="${team.flag}" alt="${team.name_en}" class="${w.teamFlag}" loading="lazy" />
        <span class="${w.teamName}">${team.name_en}</span>
      </div>
      <div class="${w.rowRight}">
        ${raw(renderGoalsBadge(team, allGames, gamesStatus))}
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
  const { selected, allTeams, allGames, gamesStatus, gamesSavedAt } = state;

  const teamById      = new Map(allTeams.map(t => [t.id, t]));
  const selectedTeams = selected.map(id => teamById.get(id)).filter(Boolean);

  return html`
    ${raw(renderPanelHead('Mi Dream Team', gamesStatus === 'stale' ? gamesSavedAt : null))}
    ${gamesStatus === 'error' ? raw(`
      <div class="${w.gamesWarn}">
        <span class="${w.gamesWarnText}">No se pudieron cargar los goles.</span>
        <button data-dt-retry class="${w.retryBtn}">Reintentar</button>
      </div>`) : ''}
    <div class="${w.scrollList}">
      ${selected.length === 0
        ? raw(`
          <div class="${w.emptyState}">
            <span class="${w.emptyIcon}">group</span>
            <p class="${w.emptyText}">Elegí tu primer equipo para arrancar.</p>
          </div>`)
        : raw(selectedTeams.map(t => renderSelectedRow(t, allGames, gamesStatus)).join(''))
      }
    </div>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function renderFooter(state) {
  const { selected, allGames, gamesStatus, gamesSavedAt } = state;
  const total = totalGoals(selected, allGames, gamesStatus);

  return html`
    <div class="${w.footerPerf}"></div>
    <div class="${w.footerStrip}">
      <span class="${w.footerLabel}">Total Goles</span>
      <div class="${w.footerRight}">
        ${gamesStatus === 'stale' ? raw(staleBadge(gamesSavedAt)) : ''}
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
    const cached = api.teamsFromCache();
    state.set(cached
      ? { allTeams: cached.data, teamsStatus: 'stale', teamsSavedAt: cached.savedAt }
      : { teamsStatus: 'error' }
    );
  }

  if (gamesResult.status === 'fulfilled') {
    state.set({ allGames: gamesResult.value, gamesStatus: 'ok', retryIn: null });
  } else {
    const cached = api.gamesFromCache();
    state.set(cached
      ? { allGames: cached.data, gamesStatus: 'stale', gamesSavedAt: cached.savedAt, retryIn: null }
      : { gamesStatus: 'error', retryIn: null }
    );
  }
}

// ── View entry point ──────────────────────────────────────────────────────────

export function renderDreamTeam(outlet) {
  const state = store({
    teamsStatus:  'loading',
    gamesStatus:  'loading',
    retryIn:      null,
    teamsSavedAt: null,
    gamesSavedAt: null,
    allTeams:     [],
    allGames:     [],
    selected:     [],
    search:       '',
  });

  component(outlet, state, render);

  const off = [
    delegate(outlet, 'input', '#dt-search', (_, target) => {
      state.set({ search: target.value });
    }),

    delegate(outlet, 'click', '[data-dt-add]', (_, target) => {
      const id = target.dataset.dtAdd;
      state.update(s => {
        if (s.selected.length >= 11 || s.selected.includes(id)) return {};
        return { selected: [...s.selected, id] };
      });
    }),

    delegate(outlet, 'click', '[data-dt-remove]', (_, target) => {
      const id = target.dataset.dtRemove;
      state.update(s => ({ selected: s.selected.filter(x => x !== id) }));
    }),

    delegate(outlet, 'click', '[data-dt-retry]', () => {
      state.set({ teamsStatus: 'loading', gamesStatus: 'loading', retryIn: null });
      loadData(state);
    }),
  ];

  loadData(state);

  return () => { state.destroy(); off.forEach(c => c()); };
}
