import { createRowId } from './mappingIssueUtils';

/**
 * 将后端的 Map 对象转换为前端的可编辑行数组
 */
export function mapToRows<TRow, TValue>(
  data: Record<string, TValue> | undefined | null,
  keyField: keyof TRow,
  rowMaker: (key: string, value: TValue) => TRow
): TRow[] {
  if (!data) return [];
  return Object.entries(data).map(([key, value]) => {
    return {
      id: createRowId(),
      ...rowMaker(key, value)
    };
  });
}

/**
 * 将前端的可编辑行数组转换回后端的 Map 对象
 */
export function rowsToMap<TRow, TValue>(
  rows: TRow[],
  keyField: keyof TRow,
  valueMapper: (row: TRow) => TValue
): Record<string, TValue> {
  const map: Record<string, TValue> = {};
  rows.forEach((row) => {
    const key = String(row[keyField] || '').trim();
    if (key) {
      map[key] = valueMapper(row);
    }
  });
  return map;
}
