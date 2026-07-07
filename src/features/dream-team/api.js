import { client } from '@shared/http/client.js';
import { cache }  from '@shared/http/cache.js';

const unwrap = (key, endpoint) => (data) => {
  if (Array.isArray(data))        return data;
  if (Array.isArray(data?.[key])) return data[key];
  throw new Error(`[dream-team] ${endpoint}: unexpected shape`);
};

const fromCache = (endpoint, extract) => {
  const entry = cache.get(endpoint);
  if (!entry) return null;
  try { return { data: extract(entry.data), savedAt: entry.savedAt }; } catch { return null; }
};

const extractTeams = unwrap('teams', '/get/teams');
const extractGames = unwrap('games', '/get/games');

const fetchTeams = async () =>
  extractTeams(await client.get('/get/teams', { cacheTtl: 300_000 }));

const fetchGames = async (onRetryTick) =>
  extractGames(await client.get('/get/games', { cacheTtl: 60_000, onRetryTick }));

export const api = Object.freeze({
  fetchTeams,
  fetchGames,
  teamsFromCache: () => fromCache('/get/teams', extractTeams),
  gamesFromCache: () => fromCache('/get/games', extractGames),
});
