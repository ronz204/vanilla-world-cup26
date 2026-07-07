export const unwrap = (key, endpoint) => (data) => {
  if (Array.isArray(data))        return data;
  if (Array.isArray(data?.[key])) return data[key];
  throw new Error(`${endpoint}: unexpected shape`);
};

export const extractTeams  = unwrap('teams',  '/get/teams');
export const extractGames  = unwrap('games',  '/get/games');
export const extractGroups = unwrap('groups', '/get/groups');
