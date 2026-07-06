const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const raw = (str) => ({ __safe: true, value: str });

const escape = (v) => {
  if (v?.__safe) return v.value;
  if (Array.isArray(v)) return v.join('');
  return String(v).replace(/[&<>"']/g, c => ESCAPE_MAP[c]);
};

export function html(strings, ...values) {
  return strings.reduce((out, str, i) =>
    out + str + (values[i] !== undefined ? escape(values[i]) : ''), '');
};
