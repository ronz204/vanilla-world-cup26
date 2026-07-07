const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const ROUND_MAP = { group: 'Grupos', r32: 'R32', r16: 'Octavos', qf: 'Cuartos', sf: 'Semi', third: '3er Lugar', final: 'Final' };

export function formatGameInfo(game) {
  if (!game.local_date) return '';
  const [datePart, timePart] = game.local_date.split(' ');
  const [m, d] = datePart.split('/');
  const date  = `${d} ${MONTHS[Number(m) - 1]} · ${timePart}`;
  const round = ROUND_MAP[game.type] ?? game.type?.toUpperCase() ?? '';
  return `${date} · ${round}`;
}

export function hasRealTeams(game) {
  return game.home_team_id !== '0' && game.away_team_id !== '0';
}

export function isValidPred(pred) {
  return pred != null
      && pred.home !== '' && pred.away !== ''
      && !isNaN(Number(pred.home)) && !isNaN(Number(pred.away));
}

export function evaluate(pred, game) {
  const ph = Number(pred.home), pa = Number(pred.away);
  const gh = Number(game.home_score), ga = Number(game.away_score);
  if (ph === gh && pa === ga) return 'exact';
  const predResult = ph > pa ? 'home' : ph < pa ? 'away' : 'draw';
  const gameResult = gh > ga ? 'home' : gh < ga ? 'away' : 'draw';
  return predResult === gameResult ? 'result' : 'miss';
}
