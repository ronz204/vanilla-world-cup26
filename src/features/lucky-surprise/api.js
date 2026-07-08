import { cache } from '@shared/http/cache.js';
import { client } from '@shared/http/client.js';
import { extractTeams, extractGames } from '@shared/http/helpers.js';

const FAV_KEY = 'wc26:tracker:favorites';

const fetchAllTeams = async () =>
  extractTeams(await client.get('/get/teams', { cacheTtl: 300_000 }));

// skipCache=true en los ticks de polling para forzar datos frescos
const fetchGames = async (onRetryTick, skipCache = false) =>
  extractGames(await client.get('/get/games', { cacheTtl: 60_000, onRetryTick, skipCache }));

const loadFavorites = () => {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) ?? []; } catch { return []; }
};

const saveFavorites = (ids) => {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(ids)); } catch { }
};

export const api = Object.freeze({
  fetchAllTeams,
  fetchGames,
  teamsFromCache: () => cache.extract('/get/teams', extractTeams),
  gamesFromCache: () => cache.extract('/get/games', extractGames),
  loadFavorites,
  saveFavorites,
});
