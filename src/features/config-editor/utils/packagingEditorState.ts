export interface PackagingEditorRowLike {
  key: string;
  value: string;
}

export function isMeaningfulPackagingRow(row: PackagingEditorRowLike) {
  return Boolean(row.key.trim() || row.value.trim());
}

export function getPackagingRowsForValidation<T extends PackagingEditorRowLike>(
  rows: T[],
  showDraftRows: boolean,
) {
  return showDraftRows ? rows : rows.filter(isMeaningfulPackagingRow);
}

export function getPackagingFilteredRows<T extends PackagingEditorRowLike>(
  rows: T[],
  showDraftRows: boolean,
  searchQuery: string,
) {
  const sourceRows = getPackagingRowsForValidation(rows, showDraftRows);
  const keyword = searchQuery.trim().toLowerCase();
  if (!keyword) return sourceRows;
  return sourceRows.filter((row) => (
    row.key.toLowerCase().includes(keyword)
    || row.value.toLowerCase().includes(keyword)
  ));
}

export function shouldReuseEmptyPackagingDraft<T extends PackagingEditorRowLike>(rows: T[]) {
  return rows.length === 1 && !isMeaningfulPackagingRow(rows[0]);
}
