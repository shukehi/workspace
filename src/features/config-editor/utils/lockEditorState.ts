export interface LockEditorRowLike {
  model: string;
  supplier: string;
  vendorName: string;
  primarySpec: string;
  secondarySpec: string;
  remark: string;
}

export function isMeaningfulLockRow(row: LockEditorRowLike) {
  return Boolean(
    row.model.trim()
    || row.supplier.trim()
    || row.vendorName.trim()
    || row.primarySpec.trim()
    || row.secondarySpec.trim()
    || row.remark.trim()
  );
}

export function getLockRowsForValidation<T extends LockEditorRowLike>(
  rows: T[],
  showDraftRows: boolean,
) {
  return showDraftRows ? rows : rows.filter(isMeaningfulLockRow);
}

export function getLockFilteredRows<T extends LockEditorRowLike>(
  rows: T[],
  showDraftRows: boolean,
  searchQuery: string,
) {
  const sourceRows = getLockRowsForValidation(rows, showDraftRows);
  const keyword = searchQuery.trim().toLowerCase();
  if (!keyword) return sourceRows;
  return sourceRows.filter((row) => (
    row.model.toLowerCase().includes(keyword)
    || row.supplier.toLowerCase().includes(keyword)
    || row.vendorName.toLowerCase().includes(keyword)
    || row.primarySpec.toLowerCase().includes(keyword)
    || row.secondarySpec.toLowerCase().includes(keyword)
    || row.remark.toLowerCase().includes(keyword)
  ));
}

export function shouldReuseEmptyLockDraft<T extends LockEditorRowLike>(rows: T[]) {
  return rows.length === 1 && !isMeaningfulLockRow(rows[0]);
}
