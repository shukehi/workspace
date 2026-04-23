export interface CylinderMappingRowLike {
  name: string;
  supplier: string;
  template: string;
}

export interface CylinderValueRowLike {
  value: string;
}

export function isMeaningfulCylinderMappingRow(row: CylinderMappingRowLike) {
  return Boolean(
    row.name.trim()
    || row.supplier.trim()
    || row.template.trim()
  );
}

export function isMeaningfulCylinderValueRow(row: CylinderValueRowLike) {
  return Boolean(row.value.trim());
}

export function getCylinderMappingRowsForValidation<T extends CylinderMappingRowLike>(
  rows: T[],
  showDraftRows: boolean,
) {
  return showDraftRows ? rows : rows.filter(isMeaningfulCylinderMappingRow);
}

export function getCylinderMappingFilteredRows<T extends CylinderMappingRowLike>(
  rows: T[],
  showDraftRows: boolean,
  searchQuery: string,
) {
  const sourceRows = getCylinderMappingRowsForValidation(rows, showDraftRows);
  const keyword = searchQuery.trim().toLowerCase();
  if (!keyword) return sourceRows;
  return sourceRows.filter((row) => (
    row.name.toLowerCase().includes(keyword)
    || row.supplier.toLowerCase().includes(keyword)
    || row.template.toLowerCase().includes(keyword)
  ));
}

export function shouldReuseEmptyCylinderMappingDraft<T extends CylinderMappingRowLike>(rows: T[]) {
  return rows.length === 1 && !isMeaningfulCylinderMappingRow(rows[0]);
}

export function getCylinderValueRows<T extends CylinderValueRowLike>(
  rows: T[],
  showDraftRows: boolean,
) {
  return showDraftRows ? rows : rows.filter(isMeaningfulCylinderValueRow);
}

export function shouldReuseEmptyCylinderValueDraft<T extends CylinderValueRowLike>(rows: T[]) {
  return rows.length === 1 && !isMeaningfulCylinderValueRow(rows[0]);
}
