import { cache } from '@shared/http/cache.js';
import { client } from '@shared/http/client.js';
import { extractTeams } from '@shared/http/helpers.js';

const DRAW_KEY = 'wc26:draw:result';

// 24h TTL — los 48 equipos no cambian durante el torneo
const fetchAllTeams = async (onRetryTick) =>
  extractTeams(await client.get('/get/teams', { cacheTtl: 24 * 60 * 60 * 1000, onRetryTick }));

const loadDraw = () => {
  try { return JSON.parse(localStorage.getItem(DRAW_KEY)); } catch { return null; }
};

const saveDraw = (data) => {
  try { localStorage.setItem(DRAW_KEY, JSON.stringify(data)); } catch { }
};

export const api = Object.freeze({
  fetchAllTeams,
  teamsFromCache: () => cache.extract('/get/teams', extractTeams),
  loadDraw,
  saveDraw,
});
