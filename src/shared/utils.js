export function timeAgo(savedAt) {
  const mins = Math.floor((Date.now() - savedAt) / 60_000);
  if (mins < 1)  return 'hace menos de 1m';
  if (mins < 60) return `hace ${mins}m`;
  return `hace ${Math.floor(mins / 60)}h`;
}
