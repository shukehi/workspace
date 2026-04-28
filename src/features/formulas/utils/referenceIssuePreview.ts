export function previewReferenceIssues(values: unknown, limit = 12): string {
  if (!Array.isArray(values)) return '';

  const preview = values.slice(0, limit).join('、');
  const remaining = values.length - limit;
  return remaining > 0 ? `${preview} 等 ${remaining} 项` : preview;
}
