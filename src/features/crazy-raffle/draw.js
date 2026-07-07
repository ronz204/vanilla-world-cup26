export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildGroups(teams) {
  const shuffled = shuffle(teams);
  return Array.from({ length: 12 }, (_, i) => ({
    label: `Grupo ${i + 1}`,
    teams: shuffled.slice(i * 4, (i + 1) * 4),
  }));
}

export function formatDrawDate(ts) {
  const d   = new Date(ts);
  const dd  = String(d.getDate()).padStart(2, '0');
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} · ${hh}:${min}`;
}
