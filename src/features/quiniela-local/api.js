import { cache } from '@shared/http/cache.js';
import { client } from '@shared/http/client.js';
import { extractTeams, extractGames } from '@shared/http/helpers.js';

const PRED_KEY = 'wc26:quiniela:predictions';

const fetchAllTeams = async () =>
  extractTeams(await client.get('/get/teams', { cacheTtl: 300_000 }));

const fetchGames = async (onRetryTick) =>
  extractGames(await client.get('/get/games', { cacheTtl: 60_000, onRetryTick }));

const loadPredictions = () => {
  try { return JSON.parse(localStorage.getItem(PRED_KEY)) ?? {}; } catch { return {}; }
};

const savePredictions = (preds) => {
  try { localStorage.setItem(PRED_KEY, JSON.stringify(preds)); } catch { }
};

export const api = Object.freeze({
  fetchAllTeams,
  fetchGames,
  teamsFromCache: () => cache.extract('/get/teams', extractTeams),
  gamesFromCache: () => cache.extract('/get/games', extractGames),
  loadPredictions,
  savePredictions,
});
