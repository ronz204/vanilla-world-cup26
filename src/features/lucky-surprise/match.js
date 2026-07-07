export function getRelevantGame(teamId, games) {
  const played = games.filter(g =>
    (g.home_team_id === teamId || g.away_team_id === teamId) &&
    (g.finished === 'TRUE' || g.time_elapsed !== 'notstarted')
  );
  return played.at(-1) ?? null;
}

export function getMatchStatus(teamId, game) {
  if (!game) return null;
  const isHome     = game.home_team_id === teamId;
  const myScore    = Number(isHome ? game.home_score : game.away_score);
  const theirScore = Number(isHome ? game.away_score : game.home_score);
  const finished   = game.finished === 'TRUE';
  return {
    myScore, theirScore, finished,
    live:    !finished && game.time_elapsed !== 'notstarted',
    losing:  myScore < theirScore,
    winning: myScore > theirScore,
  };
}
