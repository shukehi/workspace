import * as FormulaService from '../formulas';

export type FormulaWorkingMap = Record<string, { displayName: string; bom: unknown[]; status: string }>;

export async function getPublishedFormulaMap() {
  const map = await FormulaService.getPublishedFormulasMap();
  return map && typeof map === 'object' ? map as Record<string, { displayName: string; bom: unknown[] }> : {};
}

export async function getCurrentFormulaWorkingMap(): Promise<FormulaWorkingMap> {
  const list = await FormulaService.listFormulas({ page: 1, pageSize: 500 });
  const items = Array.isArray(list?.items) ? list.items : [];
  const entries = await Promise.all(items.map(async (item: { formulaKey: string; status: string; displayName: string }) => {
    if (item.status === 'archived') return null;
    const detail = await FormulaService.getFormulaDetail(item.formulaKey);
    if (!detail?.formula) return null;
    return [item.formulaKey, {
      displayName: detail.formula.displayName,
      bom: Array.isArray(detail.formula.bom) ? detail.formula.bom : [],
      status: item.status,
    }] as const;
  }));

  return Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, { displayName: string; bom: unknown[]; status: string }]>) as FormulaWorkingMap;
}
