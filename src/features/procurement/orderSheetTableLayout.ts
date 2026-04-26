/**
 * Operation column width for the edit-only row actions grid:
 * 2 × 28px buttons + 4px grid gap + 8px cell padding + 8px sticky/border breathing room.
 */
export const ORDER_SHEET_ACTION_COLUMN_WIDTH = 76;

export function calculateOrderSheetTableMinWidth(
  columns: Array<{ key: string }>,
  getColumnWidth: (key: string) => number,
  includeActionColumn: boolean,
  actionColumnWidth = ORDER_SHEET_ACTION_COLUMN_WIDTH,
) {
  const detailWidth = columns.reduce((total, column) => total + getColumnWidth(column.key), 0);
  return detailWidth + (includeActionColumn ? actionColumnWidth : 0);
}
