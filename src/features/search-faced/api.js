import { cache } from '@shared/http/cache.js';
import { client } from '@shared/http/client.js';
import { extractTeams, extractGames, extractGroups } from '@shared/http/helpers.js';

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
  teamsFromCache: () => cache.extract('/get/teams', extractTeams),
  gamesFromCache: () => cache.extract('/get/games', extractGames),
  groupsFromCache: () => cache.extract('/get/groups', extractGroups),
});
