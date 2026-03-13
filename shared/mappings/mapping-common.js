function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toTrimmedString(value) {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function quotePathSegment(segment) {
  return JSON.stringify(segment);
}

function createIssue(path, code, message) {
  return { path, code, message };
}

module.exports = {
  asRecord,
  toTrimmedString,
  isPlainObject,
  quotePathSegment,
  createIssue,
};
