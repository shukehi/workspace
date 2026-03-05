import type { OrderItem } from '@/types/order';
import type { PrintCategory } from '@/features/procurement/docModel';

export type SheetColumnAlign = 'left' | 'center' | 'right';

export interface SheetColumn {
  key: string;
  label: string;
  align: SheetColumnAlign;
  inputType: 'text' | 'number';
}

export type SheetSchema = {
  title: string;
  columns: SheetColumn[];
};

export const CATEGORY_SCHEMAS: Record<PrintCategory, SheetSchema> = {
  packaging: {
    title: '包装采购订单',
    columns: [
      { key: 'no', label: '序号', align: 'center', inputType: 'number' },
      { key: 'productModelName', label: '产品名称', align: 'left', inputType: 'text' },
      { key: 'spec', label: '规格', align: 'left', inputType: 'text' },
      { key: 'mb', label: '门边', align: 'center', inputType: 'text' },
      { key: 'qtyLeft', label: '左数量', align: 'center', inputType: 'number' },
      { key: 'qtyRight', label: '右数量', align: 'center', inputType: 'number' },
      { key: 'remark', label: '备注', align: 'left', inputType: 'text' }
    ]
  },
  cylinder: {
    title: '锁芯采购订单',
    columns: [
      { key: 'no', label: '序号', align: 'center', inputType: 'number' },
      { key: 'type', label: '锁芯型号', align: 'left', inputType: 'text' },
      { key: 'eccentricity', label: '规格', align: 'left', inputType: 'text' },
      { key: 'quantity', label: '数量', align: 'center', inputType: 'number' },
      { key: 'unit', label: '单位', align: 'center', inputType: 'text' },
      { key: 'remark', label: '备注', align: 'left', inputType: 'text' }
    ]
  },
  lock: {
    title: '锁叉采购订单',
    columns: [
      { key: 'no', label: '序号', align: 'center', inputType: 'number' },
      { key: 'type', label: '产品名称', align: 'left', inputType: 'text' },
      { key: 'spec', label: '规格', align: 'left', inputType: 'text' },
      { key: 'quantity', label: '数量', align: 'center', inputType: 'number' },
      { key: 'unit', label: '单位', align: 'center', inputType: 'text' },
      { key: 'remark', label: '备注', align: 'left', inputType: 'text' }
    ]
  },
  hardware: {
    title: '五金采购订单',
    columns: [
      { key: 'no', label: '序号', align: 'center', inputType: 'number' },
      { key: 'type', label: '五金名称', align: 'left', inputType: 'text' },
      { key: 'spec', label: '规格', align: 'left', inputType: 'text' },
      { key: 'quantity', label: '数量', align: 'center', inputType: 'number' },
      { key: 'remark', label: '备注', align: 'left', inputType: 'text' }
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
