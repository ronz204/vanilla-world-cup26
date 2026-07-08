import { api } from './api.js';
import { w } from './styles.js';

import { store } from '@context/store.js';
import { html, raw } from '@context/escape.js';
import { delegate } from '@context/delegate.js';
import { component } from '@context/component.js';

import { timeAgo } from '@shared/utils.js';
import { clearToken } from '@shared/http/auth.js';
import { AuthError } from '@shared/http/errors.js';
import { findGroupForTeam, findHeadToHeadGame, getGroupPoints } from './compare.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function staleBadge(savedAt) {
  return `<span class="${w.stalePill}">Guardado · ${timeAgo(savedAt)}</span>`;
}

function filterTeams(allTeams, query) {
  if (query.length < 2) return null;
  const q = query.toLowerCase().trim();
  return allTeams.filter(t =>
    t.name_en?.toLowerCase().includes(q) ||
    t.fifa_code?.toLowerCase().includes(q)
  );
}

// ── Status Pill ───────────────────────────────────────────────────────────────

function renderPill(state) {
  const { retryIn, globalStatus, teamsStatus, compared } = state;

  if (retryIn !== null) {
    return html`
      <div class="${w.pill} ${w.pillRetry}">
        <span class="material-symbols-outlined text-[14px]">sync</span>
        <span>Reintentando en ${retryIn}s</span>
      </div>`;
  }
  if (teamsStatus === 'loading') {
    return html`<div class="${w.pill} ${w.pillLoading}"><span>Cargando...</span></div>`;
  }
  if (teamsStatus === 'error') {
    return html`<div class="${w.pill} ${w.pillError}"><span>Sin conexión</span></div>`;
  }
  if (!compared) {
    return html`
      <div class="${w.pill} ${w.pillLive}" role="status">
        <div class="${w.pillDot}" aria-hidden="true"></div>
        <span>En vivo</span>
      </div>`;
  }
  if (globalStatus === 'loading') {
    return html`<div class="${w.pill} ${w.pillLoading}"><span>Comparando...</span></div>`;
  }
  if (globalStatus === 'stale') {
    return html`<div class="${w.pill} ${w.pillStale}"><span>Datos guardados</span></div>`;
  }
  if (globalStatus === 'error') {
    return html`<div class="${w.pill} ${w.pillError}"><span>Sin datos</span></div>`;
  }
  return html`
    <div class="${w.pill} ${w.pillLive}" role="status">
      <div class="${w.pillDot}" aria-hidden="true"></div>
      <span>En vivo</span>
    </div>`;
}

// ── Suggestions dropdown ──────────────────────────────────────────────────────

function renderSuggestions(slot, matches) {
  if (!matches.length) {
    return `<div class="${w.suggestions}"><p class="${w.suggEmpty}">Sin resultados.</p></div>`;
  }
  const items = matches.slice(0, 8).map(t => html`
    <div class="${w.suggItem}"
      data-sf-pick="${slot}"
      data-sf-id="${t.id}"
      data-sf-name="${t.name_en}"
      data-sf-flag="${t.flag ?? ''}"
      data-sf-code="${t.fifa_code ?? ''}">
      <img src="${t.flag ?? ''}" alt="${t.name_en}" class="${w.suggFlag}" loading="lazy" />
      <span class="${w.suggName}">${t.name_en}</span>
      <span class="${w.suggCode}">${t.fifa_code ?? ''}</span>
    </div>`).join('');
  return `<div class="${w.suggestions}">${items}</div>`;
}

// ── Search inputs section ─────────────────────────────────────────────────────

function renderSearchInput(slot, state) {
  const query    = state[`query${slot}`];
  const selected = state[`team${slot}`];
  const matches  = filterTeams(state.allTeams, query);
  const open     = !selected && matches !== null;

  const inputCls = selected ? w.searchInputSel : w.searchInput;
  const label    = slot === 'A' ? 'Equipo 1' : 'Equipo 2';
  const inputId  = `sf-input-${slot.toLowerCase()}`;

  return html`
    <div>
      <label for="${inputId}" class="${w.searchLabel}">${label}</label>
      <div class="${w.searchWrap}">
        <span class="${w.searchIcon}">search</span>
        <input
          id="${inputId}"
          type="text"
          placeholder="Nombre o código FIFA..."
          value="${selected ? selected.name_en : query}"
          class="${inputCls}"
          data-sf-slot="${slot}"
          autocomplete="off"
          ${selected ? 'readonly' : ''}
        />
        ${open ? raw(renderSuggestions(slot, matches)) : ''}
      </div>
    </div>`;
}

function renderControls(state) {
  const canCompare = state.teamA && state.teamB;
  const showReset  = state.teamA || state.teamB || state.compared;
  return html`
    <div class="flex items-center gap-4 mt-4">
      <button
        data-sf-compare
        class="${w.compareBtn}"
        ${canCompare && state.teamsStatus !== 'loading' ? '' : 'disabled'}
      >
        Comparar
      </button>
      ${showReset ? raw(`<button data-sf-reset class="${w.resetBtn}">Limpiar</button>`) : ''}
    </div>`;
}

// ── Team column ───────────────────────────────────────────────────────────────

function renderTeamSkeleton(label) {
  return `
    <div class="${w.colHeader}">
      <span class="${w.colLabel}">${label}</span>
    </div>
    <div class="${w.skeleton}"></div>`;
}

function renderTeamError(label, slot) {
  return `
    <div class="${w.colHeader}">
      <span class="${w.colLabel}">${label}</span>
    </div>
    <div class="${w.errorBanner}">
      <p class="${w.errorText}">No se pudo cargar la información del equipo.</p>
      <button data-sf-retry="${slot}" class="${w.retryBtn}">Reintentar</button>
    </div>`;
}

function renderTeamCard(team, group, savedAt) {
  const pts   = getGroupPoints(team.id, group);
  const entry = group?.teams?.find(t => String(t.team_id) === String(team.id));

  return `
    <div class="${w.teamCard}">
      <img src="${team.flag ?? ''}" alt="${team.name_en}" class="${w.teamFlag}" loading="lazy" />
      <p class="${w.teamName}">${team.name_en}</p>
      <p class="${w.teamCode}">${team.fifa_code ?? ''}</p>
      <div class="${w.teamStats}">
        <div class="${w.statRow}">
          <span class="${w.statLabel}">Grupo</span>
          <span class="${w.statVal}">${group?.name ?? '—'}</span>
        </div>
        <div class="${w.statRow}">
          <span class="${w.statLabel}">Puntos</span>
          <span class="${w.statValGold}">${pts !== null ? pts : '—'}</span>
        </div>
        <div class="${w.statRow}">
          <span class="${w.statLabel}">GF</span>
          <span class="${w.statVal}">${entry ? Number(entry.gf) : '—'}</span>
        </div>
        <div class="${w.statRow}">
          <span class="${w.statLabel}">GA</span>
          <span class="${w.statVal}">${entry ? Number(entry.ga) : '—'}</span>
        </div>
      </div>
      ${savedAt ? `<div class="mt-3 flex justify-center">${staleBadge(savedAt)}</div>` : ''}
    </div>`;
}

function renderColumn(slot, state) {
  const label     = slot === 'A' ? 'Equipo 1' : 'Equipo 2';
  const colStatus = state[`col${slot}Status`];
  const team      = state[`result${slot}`];
  const group     = state[`group${slot}`];

  if (colStatus === 'loading') return renderTeamSkeleton(label);
  if (colStatus === 'error')   return renderTeamError(label, slot);
  if (!team) return `
    <div class="${w.colHeader}">
      <span class="${w.colLabel}">${label}</span>
    </div>
    <div class="${w.emptyState}">
      <span class="${w.emptyIcon}">person_search</span>
      <p class="${w.emptyText}">Seleccioná un equipo.</p>
    </div>`;

  return renderTeamCard(team, group, state.groupsSavedAt);
}

// ── Head-to-head match ────────────────────────────────────────────────────────

function renderMatch(state) {
  const { resultA, resultB, h2hGame, gamesSavedAt, colAStatus, colBStatus } = state;
  if (!resultA || !resultB) return '';

  if (!h2hGame) {
    const loaded = colAStatus !== 'loading' && colBStatus !== 'loading';
    return `
      <div class="${w.matchSection}">
        <p class="${w.matchTitle}">Partido directo</p>
        <div class="${w.matchCard}">
          <p class="font-mono text-[11px] text-ink-dim text-center">
            ${loaded
              ? 'Estos equipos no se han enfrentado en fase de grupos.'
              : 'Verificando enfrentamientos...'}
          </p>
        </div>
      </div>`;
  }

  const finished   = h2hGame.finished === 'TRUE';
  const homeIsA    = String(h2hGame.home_team_id) === String(resultA.id);
  const scoreLeft  = homeIsA ? h2hGame.home_score : h2hGame.away_score;
  const scoreRight = homeIsA ? h2hGame.away_score : h2hGame.home_score;

  return `
    <div class="${w.matchSection}">
      <p class="${w.matchTitle}">Partido directo${gamesSavedAt ? ' · ' + staleBadge(gamesSavedAt) : ''}</p>
      <div class="${w.matchCard}">
        <div class="${w.matchRow}">
          <div class="${w.matchTeam}">
            <img src="${resultA.flag ?? ''}" alt="${resultA.name_en}" class="w-10 h-7 object-cover rounded-sm" loading="lazy" />
            <span class="${w.matchTeamName}">${resultA.name_en}</span>
          </div>
          ${finished
            ? `<div class="flex items-center gap-2">
                <span class="${w.matchScore}">${Number(scoreLeft)}</span>
                <span class="${w.matchScoreSep}">–</span>
                <span class="${w.matchScore}">${Number(scoreRight)}</span>
               </div>`
            : `<span class="font-mono text-[14px] text-ink-dim">vs</span>`}
          <div class="${w.matchTeam}">
            <img src="${resultB.flag ?? ''}" alt="${resultB.name_en}" class="w-10 h-7 object-cover rounded-sm" loading="lazy" />
            <span class="${w.matchTeamName}">${resultB.name_en}</span>
          </div>
        </div>
        <p class="${w.matchMeta}">${finished ? 'Finalizado' : 'No jugado aún'}</p>
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

        <div class="${w.stub}">
          <div class="${w.stubLeft}">
            <span class="${w.stubTag}">Cara a Cara</span>
            <span class="${w.stubLabel}">Comparador de Equipos</span>
          </div>
          ${raw(renderPill(state))}
        </div>

        <div class="${w.perf}"></div>

        <div class="${w.body}">
          <div class="${w.searchSection}">
            <div class="${w.searchRow}">
              ${raw(renderSearchInput('A', state))}
              ${raw(renderSearchInput('B', state))}
            </div>
            ${raw(renderControls(state))}
          </div>

          ${state.compared ? raw(`
            <div class="${w.perf} mb-6 opacity-30"></div>
            <div class="${w.grid}">
              <div class="${w.column}">${renderColumn('A', state)}</div>
              <div class="${w.column}">${renderColumn('B', state)}</div>
            </div>
            ${renderMatch(state)}
          `) : ''}
        </div>
      </div>
    </div>`;
}

// ── Data loading ──────────────────────────────────────────────────────────────

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

// ── Compare logic ─────────────────────────────────────────────────────────────

function deriveGlobalStatus(colStatus, gamesSavedAt, groupsSavedAt) {
  if (colStatus === 'loading') return 'loading';
  if (colStatus === 'error')   return 'error';
  if (colStatus === 'stale' || gamesSavedAt || groupsSavedAt) return 'stale';
  return 'ok';
}

async function runCompare(state) {
  const { teamA, teamB } = state.get();
  if (!teamA || !teamB) return;

  state.set({
    compared:     true,
    colAStatus:   'loading',
    colBStatus:   'loading',
    resultA:      null,
    resultB:      null,
    groupA:       null,
    groupB:       null,
    h2hGame:      null,
    gamesSavedAt: null,
    groupsSavedAt: null,
    globalStatus: 'loading',
    retryIn:      null,
  });

  const onRetryTick = s => state.set({ retryIn: s });

  const [gamesResult, groupsResult] = await Promise.allSettled([
    api.fetchGames(onRetryTick),
    api.fetchGroups(onRetryTick),
  ]);

  if ([gamesResult, groupsResult].some(r => r.status === 'rejected' && r.reason instanceof AuthError)) {
    clearToken(); location.hash = '/'; return;
  }

  const games = gamesResult.status === 'fulfilled'
    ? gamesResult.value
    : api.gamesFromCache()?.data ?? null;

  const gamesSavedAt = gamesResult.status === 'rejected'
    ? api.gamesFromCache()?.savedAt ?? null
    : null;

  const groups = groupsResult.status === 'fulfilled'
    ? groupsResult.value
    : api.groupsFromCache()?.data ?? null;

  const groupsSavedAt = groupsResult.status === 'rejected'
    ? api.groupsFromCache()?.savedAt ?? null
    : null;

  const groupA   = groups ? findGroupForTeam(teamA.id, groups) : null;
  const groupB   = groups ? findGroupForTeam(teamB.id, groups) : null;
  const h2hGame  = games  ? findHeadToHeadGame(teamA.id, teamB.id, games) : null;

  const colStatus = groupsResult.status === 'fulfilled' ? 'ok' : groups ? 'stale' : 'error';

  state.set({
    resultA:      teamA,
    resultB:      teamB,
    groupA,
    groupB,
    h2hGame,
    gamesSavedAt,
    groupsSavedAt,
    colAStatus:   colStatus,
    colBStatus:   colStatus,
    retryIn:      null,
    globalStatus: deriveGlobalStatus(colStatus, gamesSavedAt, groupsSavedAt),
  });
}

// ── View entry point ──────────────────────────────────────────────────────────

export function renderHeadToHead(outlet) {
  const state = store({
    allTeams:     [],
    teamsStatus:  'loading',
    queryA: '', queryB: '',
    teamA:  null, teamB: null,
    compared:      false,
    colAStatus:    'idle',
    colBStatus:    'idle',
    resultA:       null,
    resultB:       null,
    groupA:        null,
    groupB:        null,
    h2hGame:       null,
    gamesSavedAt:  null,
    groupsSavedAt: null,
    globalStatus:  'idle',
    retryIn:       null,
  });

  component(outlet, state, render);

  const off = [
    delegate(outlet, 'input', '[data-sf-slot]', (_, target) => {
      const slot = target.dataset.sfSlot;
      const val  = target.value;
      // Typing over a selected team clears it and restarts the filter
      state.update(s => s[`team${slot}`]
        ? { [`team${slot}`]: null, [`query${slot}`]: val }
        : { [`query${slot}`]: val }
      );
    }),

    delegate(outlet, 'click', '[data-sf-pick]', (_, target) => {
      const slot = target.dataset.sfPick;
      const team = {
        id:        target.dataset.sfId,
        name_en:   target.dataset.sfName,
        flag:      target.dataset.sfFlag,
        fifa_code: target.dataset.sfCode,
      };
      state.set({ [`team${slot}`]: team, [`query${slot}`]: team.name_en });
    }),

    delegate(outlet, 'click', '[data-sf-compare]', () => runCompare(state)),

    delegate(outlet, 'click', '[data-sf-reset]', () => {
      state.set({
        queryA: '', queryB: '',
        teamA: null, teamB: null,
        compared: false,
        colAStatus: 'idle', colBStatus: 'idle',
        resultA: null, resultB: null,
        groupA: null, groupB: null,
        h2hGame: null,
        gamesSavedAt: null, groupsSavedAt: null,
        globalStatus: 'idle', retryIn: null,
      });
    }),

    delegate(outlet, 'click', '[data-sf-retry]', () => runCompare(state)),
  ];

  loadTeams(state);

  return () => { state.destroy(); off.forEach(c => c()); };
}
