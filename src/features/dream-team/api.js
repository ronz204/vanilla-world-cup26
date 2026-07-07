import { client } from '@shared/http/client.js';
import { cache }  from '@shared/http/cache.js';

const extractTeams = (data) => {
  if (Array.isArray(data))        return data;
  if (Array.isArray(data?.teams)) return data.teams;
  throw new Error('[dream-team] /get/teams: unexpected response shape');
};

const extractGames = (data) => {
  if (Array.isArray(data))        return data;
  if (Array.isArray(data?.games)) return data.games;
  throw new Error('[dream-team] /get/games: unexpected response shape');
};

const fetchTeams = async () =>
  extractTeams(await client.get('/get/teams', { cacheTtl: 300_000 }));

const fetchGames = async (onRetryTick) =>
  extractGames(await client.get('/get/games', { cacheTtl: 60_000, onRetryTick }));

const teamsFromCache = () => {
  const entry = cache.get('/get/teams');
  try { return entry ? extractTeams(entry.data) : null; } catch { return null; }
};

const gamesFromCache = () => {
  const entry = cache.get('/get/games');
  try { return entry ? extractGames(entry.data) : null; } catch { return null; }
};

export const api = Object.freeze({ fetchTeams, fetchGames, teamsFromCache, gamesFromCache });
