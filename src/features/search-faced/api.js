import { client } from '@shared/http/client.js';
import { cache }  from '@shared/http/cache.js';

const unwrap = (key, endpoint) => (data) => {
  if (Array.isArray(data))        return data;
  if (Array.isArray(data?.[key])) return data[key];
  throw new Error(`[search-faced] ${endpoint}: unexpected shape`);
};

const fromCache = (endpoint, extract) => {
  const entry = cache.get(endpoint);
  if (!entry) return null;
  try { return { data: extract(entry.data), savedAt: entry.savedAt }; } catch { return null; }
};

const extractTeams  = unwrap('teams',  '/get/teams');
const extractGames  = unwrap('games',  '/get/games');
const extractGroups = unwrap('groups', '/get/groups');

const fetchAllTeams = async () =>
  extractTeams(await client.get('/get/teams', { cacheTtl: 300_000 }));

const fetchGames = async (onRetryTick) =>
  extractGames(await client.get('/get/games', { cacheTtl: 60_000, onRetryTick }));

const fetchGroups = async (onRetryTick) =>
  extractGroups(await client.get('/get/groups', { cacheTtl: 300_000, onRetryTick }));

export const api = Object.freeze({
  fetchAllTeams,
  fetchGames,
  fetchGroups,
  teamsFromCache:  () => fromCache('/get/teams',  extractTeams),
  gamesFromCache:  () => fromCache('/get/games',  extractGames),
  groupsFromCache: () => fromCache('/get/groups', extractGroups),
});
