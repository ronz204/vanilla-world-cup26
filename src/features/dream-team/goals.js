export function calcGoals(teamId, games) {
  return games
    .filter(g => g.finished === 'TRUE')
    .reduce((acc, g) => {
      if (g.home_team_id === teamId) return acc + Number(g.home_score);
      if (g.away_team_id === teamId) return acc + Number(g.away_score);
      return acc;
    }, 0);
}

export function totalGoals(selected, allGames, gamesStatus) {
  if (gamesStatus !== 'ok' && gamesStatus !== 'stale') return null;
  return selected.reduce((acc, id) => acc + calcGoals(id, allGames), 0);
}
