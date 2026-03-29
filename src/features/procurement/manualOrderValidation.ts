import type { Order, OrderItem } from '@/types/order';
import type { PrintCategory } from '@/features/procurement/docModel';
import { resolveOrderItemQuantity, supportsSplitQuantityColumns } from '@/features/procurement/order-sheet.schema';
import { resolveOrderSchemaPrintCategory, resolveSchemaPrintCategory } from '@/features/procurement/templateType';

export interface ManualOrderValidationIssue {
  path: string;
  message: string;
  rowIndex?: number;
  columnKey?: string;
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveDescriptor(item: Partial<OrderItem>, category: PrintCategory): string {
  if (category === 'packaging') {
    return (
      toTrimmedString(item.name)
      || toTrimmedString(item.internal_name)
      || toTrimmedString(item.external_name)
    );
  }

  return toTrimmedString(item.type) || toTrimmedString(item.name);
}

function resolveSpecLike(item: Partial<OrderItem>, category: PrintCategory): string {
  if (category === 'cylinder') {
    return (
      toTrimmedString(item.eccentricity)
      || toTrimmedString(item.spec)
      || toTrimmedString(item.model)
    );
  }

  return toTrimmedString(item.spec) || toTrimmedString(item.model);
}

function hasMeaningfulInput(item: Partial<OrderItem>, category: PrintCategory): boolean {
  if (resolveDescriptor(item, category)) return true;
  if (resolveSpecLike(item, category)) return true;
  if (toTrimmedString(item.remark)) return true;
  if (toTrimmedString(item.mb)) return true;
  return resolveOrderItemQuantity(item, category) > 0;
}

function resolveValidatedQuantity(item: Partial<OrderItem>, category: PrintCategory): number {
  const splitQuantity = resolveOrderItemQuantity(item, category);
  if (splitQuantity > 0) return splitQuantity;
  if (supportsSplitQuantityColumns(category)) {
    return Number(item.quantity || 0);
  }
  return splitQuantity;
}

function isValidIsoDate(value: unknown): boolean {
  const raw = toTrimmedString(value);
  if (!raw) return false;
  const parsed = new Date(raw);
  return !Number.isNaN(parsed.getTime());
}

export function stripBlankManualItems(
  items: Partial<OrderItem>[] | undefined,
  categoryRaw: string | undefined,
  templateTypeRaw?: unknown,
): Partial<OrderItem>[] {
  const category = resolveSchemaPrintCategory(templateTypeRaw, categoryRaw);
  return (items || []).filter((item) => hasMeaningfulInput(item, category));
}

export function validateManualOrderDraft(order: Partial<Order>): string[] {
  return collectManualOrderValidationIssues(order).map((issue) => issue.message);
}

export function collectManualOrderValidationIssues(order: Partial<Order>): ManualOrderValidationIssue[] {
  const issues: ManualOrderValidationIssue[] = [];
  const category = resolveOrderSchemaPrintCategory(order);
  const customerName = toTrimmedString(order.metadata?.customer_name);
  const supplier = toTrimmedString(order.supplier);
  const items = stripBlankManualItems(
    order.items as Partial<OrderItem>[] | undefined,
    order.category,
    order.metadata?.template_type,
  );

  if (!toTrimmedString(order.order_no)) {
    issues.push({ path: 'order_no', message: '订单号不能为空' });
  }
  if (!supplier) {
    issues.push({ path: 'supplier', message: '供应商不能为空' });
  }
  if (!customerName) {
    issues.push({ path: 'metadata.customer_name', message: '客户名称不能为空' });
  }
  if (!isValidIsoDate(order.delivery_date)) {
    issues.push({ path: 'delivery_date', message: '交货日期不能为空' });
  }
  if (items.length === 0) {
    issues.push({ path: 'items', message: '请至少填写一条有效明细' });
    return issues;
  }

  items.forEach((item, index) => {
    const row = `第 ${index + 1} 行`;
    if (!resolveDescriptor(item, category)) {
      issues.push({
        path: `items.${index}.name`,
        message: `${row}缺少产品名称`,
        rowIndex: index,
        columnKey: category === 'packaging' ? 'productModelName' : 'type',
      });
    }
    if (!resolveSpecLike(item, category)) {
      issues.push({
        path: `items.${index}.spec`,
        message: `${row}缺少规格`,
        rowIndex: index,
        columnKey: category === 'cylinder' ? 'eccentricity' : 'spec',
      });
    }
    if (resolveValidatedQuantity(item, category) <= 0) {
      const quantityLabel = supportsSplitQuantityColumns(category) ? '数量（左/右）' : '数量';
      issues.push({
        path: `items.${index}.quantity`,
        message: `${row}${quantityLabel}必须大于 0`,
        rowIndex: index,
        columnKey: supportsSplitQuantityColumns(category) ? 'qtyLeft' : 'quantity',
      });
    }
  });

  return issues;
}
