export function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function quotePathSegment(segment) {
  return JSON.stringify(segment);
}

export function createIssue(path, code, message) {
  return { path, code, message };
}
