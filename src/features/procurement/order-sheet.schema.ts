import type { OrderItem } from '@/types/order';
import type { PrintCategory } from '@/features/procurement/docModel';

export type SheetColumnAlign = 'left' | 'center' | 'right';
export type SheetColumnSemantic = 'index' | 'name' | 'specLike' | 'edge' | 'quantity' | 'unit' | 'remark';

export interface SheetColumn {
  key: string;
  label: string;
  align: SheetColumnAlign;
  inputType: 'text' | 'number';
  semantic: SheetColumnSemantic;
}

export type SheetSchema = {
  title: string;
  columns: SheetColumn[];
};

function resolveLabelBySemantic(semantic: SheetColumnSemantic, fallbackLabel: string) {
  if (semantic === 'specLike') return '规格';
  return fallbackLabel;
}

function createColumn(
  key: string,
  fallbackLabel: string,
  align: SheetColumnAlign,
  inputType: 'text' | 'number',
  semantic: SheetColumnSemantic
): SheetColumn {
  return {
    key,
    label: resolveLabelBySemantic(semantic, fallbackLabel),
    align,
    inputType,
    semantic
  };
}

export const CATEGORY_SCHEMAS: Record<PrintCategory, SheetSchema> = {
  packaging: {
    title: '包装采购订单',
    columns: [
      createColumn('no', '序号', 'center', 'number', 'index'),
      createColumn('productModelName', '产品名称', 'left', 'text', 'name'),
      createColumn('spec', '规格尺寸', 'left', 'text', 'specLike'),
      createColumn('mb', '门边', 'center', 'text', 'edge'),
      createColumn('qtyLeft', '左数量', 'center', 'number', 'quantity'),
      createColumn('qtyRight', '右数量', 'center', 'number', 'quantity'),
      createColumn('remark', '备注', 'left', 'text', 'remark')
    ]
  },
  cylinder: {
    title: '锁芯采购订单',
    columns: [
      createColumn('no', '序号', 'center', 'number', 'index'),
      createColumn('type', '锁芯型号', 'left', 'text', 'name'),
      createColumn('eccentricity', '偏心', 'left', 'text', 'specLike'),
      createColumn('quantity', '数量', 'center', 'number', 'quantity'),
      createColumn('unit', '单位', 'center', 'text', 'unit'),
      createColumn('remark', '备注', 'left', 'text', 'remark')
    ]
  },
  lock: {
    title: '锁叉采购订单',
    columns: [
      createColumn('no', '序号', 'center', 'number', 'index'),
      createColumn('type', '产品名称', 'left', 'text', 'name'),
      createColumn('spec', '规格', 'left', 'text', 'specLike'),
      createColumn('quantity', '数量', 'center', 'number', 'quantity'),
      createColumn('unit', '单位', 'center', 'text', 'unit'),
      createColumn('remark', '备注', 'left', 'text', 'remark')
    ]
  },
  hardware: {
    title: '五金采购订单',
    columns: [
      createColumn('no', '序号', 'center', 'number', 'index'),
      createColumn('type', '五金名称', 'left', 'text', 'name'),
      createColumn('spec', '规格', 'left', 'text', 'specLike'),
      createColumn('quantity', '数量', 'center', 'number', 'quantity'),
      createColumn('remark', '备注', 'left', 'text', 'remark')
    ]
  }
};

export function getSheetSchema(category: PrintCategory): SheetSchema {
  return CATEGORY_SCHEMAS[category];
}

export function getDisplayValue(item: Partial<OrderItem>, key: string, rowIndex: number): string | number {
  if (key === 'no') return rowIndex + 1;
  if (key === 'productModelName') return item.name || '-';
  if (key === 'type') return item.type || item.name || '-';
  if (key === 'spec') return item.spec || item.model || '-';
  if (key === 'mb') return item.mb || item.orientation || '-';
  if (key === 'qtyLeft') return item.quantity_left ?? '-';
  if (key === 'qtyRight') return item.quantity_right ?? '-';
  if (key === 'quantity') return item.quantity ?? 0;
  if (key === 'eccentricity') return item.eccentricity || '-';
  if (key === 'unit') return item.unit || '-';
  if (key === 'remark') return item.remark || '-';
  return '-';
}

export function getEditableValue(item: Partial<OrderItem>, key: string): string | number {
  if (key === 'productModelName') return item.name || '';
  if (key === 'type') return item.type || '';
  if (key === 'spec') return item.spec || '';
  if (key === 'mb') return item.mb || '';
  if (key === 'qtyLeft') return item.quantity_left ?? '';
  if (key === 'qtyRight') return item.quantity_right ?? '';
  if (key === 'quantity') return item.quantity ?? '';
  if (key === 'eccentricity') return item.eccentricity || '';
  if (key === 'unit') return item.unit || '';
  if (key === 'remark') return item.remark || '';
  return '';
}

export function setEditableValue(item: Partial<OrderItem>, key: string, value: string | number | null) {
  if (key === 'productModelName') item.name = String(value ?? '');
  else if (key === 'type') item.type = String(value ?? '');
  else if (key === 'spec') item.spec = String(value ?? '');
  else if (key === 'mb') item.mb = String(value ?? '');
  else if (key === 'qtyLeft') item.quantity_left = value === null || value === '' ? null as any : Number(value);
  else if (key === 'qtyRight') item.quantity_right = value === null || value === '' ? null as any : Number(value);
  else if (key === 'quantity') item.quantity = value === null || value === '' ? 0 : Number(value);
  else if (key === 'eccentricity') item.eccentricity = String(value ?? '');
  else if (key === 'unit') item.unit = String(value ?? '');
  else if (key === 'remark') item.remark = String(value ?? '');
}

export function isNumericColumn(key: string) {
  return key === 'quantity' || key === 'qtyLeft' || key === 'qtyRight' || key === 'no';
}
