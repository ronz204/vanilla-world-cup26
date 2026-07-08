import { cache } from '@shared/http/cache.js';
import { client } from '@shared/http/client.js';
import { extractTeams, extractGames } from '@shared/http/helpers.js';

const fetchTeams = async () =>
  extractTeams(await client.get('/get/teams', { cacheTtl: 300_000 }));

const fetchGames = async (onRetryTick) =>
  extractGames(await client.get('/get/games', { cacheTtl: 60_000, onRetryTick }));

export const api = Object.freeze({
  fetchTeams,
  fetchGames,
  teamsFromCache: () => cache.extract('/get/teams', extractTeams),
  gamesFromCache: () => cache.extract('/get/games', extractGames),
});
