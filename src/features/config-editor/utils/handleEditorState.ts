export interface HandleEditorRowLike {
  model: string;
  supplier: string;
  vendorName: string;
  materialCode: string;
}

export function isMeaningfulHandleRow(row: HandleEditorRowLike) {
  return Boolean(
    row.model.trim()
    || row.supplier.trim()
    || row.vendorName.trim()
    || row.materialCode.trim()
  );
}

export function getHandleRowsForValidation<T extends HandleEditorRowLike>(
  rows: T[],
  showDraftRows: boolean,
) {
  return showDraftRows ? rows : rows.filter(isMeaningfulHandleRow);
}

export function getHandleFilteredRows<T extends HandleEditorRowLike>(
  rows: T[],
  showDraftRows: boolean,
  searchQuery: string,
) {
  const sourceRows = getHandleRowsForValidation(rows, showDraftRows);
  const keyword = searchQuery.trim().toLowerCase();
  if (!keyword) return sourceRows;
  return sourceRows.filter((row) => (
    row.model.toLowerCase().includes(keyword)
    || row.supplier.toLowerCase().includes(keyword)
    || row.vendorName.toLowerCase().includes(keyword)
    || row.materialCode.toLowerCase().includes(keyword)
  ));
}

export function shouldReuseEmptyHandleDraft<T extends HandleEditorRowLike>(rows: T[]) {
  return rows.length === 1 && !isMeaningfulHandleRow(rows[0]);
}
