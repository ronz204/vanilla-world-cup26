export function findGroupForTeam(teamId, groups) {
  return groups.find(g =>
    g.teams?.some(t => String(t.team_id) === String(teamId))
  ) ?? null;
}

export function findHeadToHeadGame(idA, idB, games) {
  return games.find(g => {
    const home = String(g.home_team_id);
    const away = String(g.away_team_id);
    return (home === String(idA) && away === String(idB)) ||
           (home === String(idB) && away === String(idA));
  }) ?? null;
}

export function getGroupPoints(teamId, group) {
  const entry = group?.teams?.find(t => String(t.team_id) === String(teamId));
  return entry ? Number(entry.pts) : null;
}
