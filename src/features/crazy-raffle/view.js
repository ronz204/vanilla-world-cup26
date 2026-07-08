import { api } from './api.js';
import { w } from './styles.js';

import { store } from '@context/store.js';
import { html, raw } from '@context/escape.js';
import { delegate } from '@context/delegate.js';
import { component } from '@context/component.js';

import { clearToken } from '@shared/http/auth.js';
import { AuthError } from '@shared/http/errors.js';
import { buildGroups, formatDrawDate } from './draw.js';

// ── Status Pill ─────────────────────────────────────────────────────────────────

function renderPill({ teamsStatus, retryIn }) {
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
    ok:      [w.pillOk,      'Listo'],
  };
  const [cls, label] = variants[teamsStatus] ?? variants.ok;
  return html`<div class="${w.pill} ${cls}"><span>${label}</span></div>`;
}

// ── Stub ────────────────────────────────────────────────────────────────────────

function renderStub(state) {
  const { teamsStatus, allTeams } = state;
  const canRepeat = teamsStatus !== 'loading' && allTeams.length > 0;
  return html`
    <div class="${w.stub}">
      <div class="${w.stubLeft}">
        <span class="${w.stubTag}">Sorteo Loco</span>
        <span class="${w.stubLabel}">Simulador de Grupos</span>
      </div>
      <div class="${w.stubRight}">
        ${raw(renderPill(state))}
        <button
          data-dr-repeat
          class="${w.repeatBtn}"
          ${canRepeat ? '' : 'disabled'}
          aria-label="Nuevo sorteo aleatorio"
        >
          <span class="${w.repeatIcon}">shuffle</span>
          <span>Repetir sorteo</span>
        </button>
      </div>
    </div>`;
}

// ── Group card ──────────────────────────────────────────────────────────────────

function renderGroupCard(group) {
  const teamRows = group.teams.map(t => html`
    <div class="${w.teamRow}">
      <img src="${t.flag}" alt="" class="${w.teamFlag}" loading="lazy">
      <span class="${w.teamName}">${t.name_en}</span>
      <span class="${w.teamCode}">${t.fifa_code}</span>
    </div>`).join('');

  return html`
    <div class="${w.groupCard}">
      <div class="${w.groupStub}">
        <span class="${w.groupLabel}">Sorteo</span>
        <span class="${w.groupNum}">${group.label}</span>
      </div>
      <div class="${w.groupPerf}"></div>
      <div class="${w.teamList}">${raw(teamRows)}</div>
    </div>`;
}

// ── Draw meta bar ───────────────────────────────────────────────────────────────

function renderDrawMeta(state) {
  const { drawSavedAt, teamsStatus } = state;
  if (!drawSavedAt) return '';
  const staleTag = teamsStatus === 'stale'
    ? `<span class="${w.stalePill}">Equipos guardados</span>`
    : '';
  return `
    <div class="${w.drawMeta}">
      <span class="${w.drawBadge}">Sorteo del ${formatDrawDate(drawSavedAt)}</span>
      ${staleTag}
    </div>`;
}

// ── Root render ──────────────────────────────────────────────────────────────────

function render(state) {
  const { draw, teamsStatus } = state;

  let bodyContent;

  if (draw) {
    const cards = draw.map(g => renderGroupCard(g)).join('');
    bodyContent = `
      ${renderDrawMeta(state)}
      <div class="${w.grid}">${cards}</div>`;
  } else if (teamsStatus === 'error') {
    bodyContent = `
      <div class="${w.emptyState}">
        <span class="${w.emptyIcon}">casino</span>
        <p class="${w.emptyText}">No se pudo obtener la lista de equipos para el sorteo.</p>
        <button data-dr-retry class="${w.retryBtn}">Reintentar</button>
      </div>`;
  } else {
    bodyContent = `<div class="${w.grid}">${Array.from({ length: 12 }, () => `<div class="${w.skeletonCard}"></div>`).join('')}</div>`;
  }

  return html`
    <div class="${w.page}">
      <div class="${w.card}">
        <div class="${w.notchL}" aria-hidden="true"></div>
        <div class="${w.notchR}" aria-hidden="true"></div>
        ${raw(renderStub(state))}
        <div class="${w.perf}"></div>
        <div class="${w.body}">
          ${raw(bodyContent)}
        </div>
      </div>
    </div>`;
}

// ── Draw logic ───────────────────────────────────────────────────────────────────

function makeDraw(state, teams) {
  const groups    = buildGroups(teams);
  const createdAt = Date.now();
  state.set({ draw: groups, drawSavedAt: createdAt });
  api.saveDraw({ groups, createdAt });
}

// ── Data loading ─────────────────────────────────────────────────────────────────

async function loadTeams(state) {
  const onRetryTick = s => state.set({ retryIn: s });
  try {
    const teams = await api.fetchAllTeams(onRetryTick);
    state.set({ allTeams: teams, teamsStatus: 'ok', retryIn: null });
    if (!state.get().draw) makeDraw(state, teams);
  } catch (err) {
    if (err instanceof AuthError) { clearToken(); location.hash = '/'; return; }
    state.set({ retryIn: null });
    const cached = api.teamsFromCache();
    if (cached) {
      state.set({ allTeams: cached.data, teamsStatus: 'stale' });
      if (!state.get().draw) makeDraw(state, cached.data);
    } else {
      state.set({ teamsStatus: 'error' });
    }
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────────

export function renderDraw(outlet) {
  const saved = api.loadDraw();  // carga sincrónica — muestra sorteo previo sin esperar la API

  const state = store({
    allTeams:    [],
    teamsStatus: 'loading',
    draw:        saved?.groups    ?? null,
    drawSavedAt: saved?.createdAt ?? null,
    retryIn:     null,
  });

  component(outlet, state, render);

  const off = [
    delegate(outlet, 'click', '[data-dr-repeat]', () => {
      const { allTeams, teamsStatus } = state.get();
      // El disabled attribute bloquea el click en la mayoría de browsers,
      // pero el delegate usa propagación de eventos — la guarda es necesaria.
      if (teamsStatus === 'loading' || allTeams.length === 0) return;
      makeDraw(state, allTeams);
    }),

    delegate(outlet, 'click', '[data-dr-retry]', () => {
      state.set({ teamsStatus: 'loading' });
      loadTeams(state);
    }),
  ];

  loadTeams(state);  // carga teams para habilitar "Repetir sorteo"; si hay sorteo guardado no bloquea el render

  return () => {
    state.destroy();
    off.forEach(c => c());
  };
}
