import type { InventoryItem, InventoryOutbound, InventoryReceipt } from '@/types/inventory';

function escapeCsvCell(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReceiptsToCSV(data: InventoryReceipt[]) {
  if (!Array.isArray(data) || data.length === 0) return;

  const headers = ['入库日期', '订单号', '仓库', '库位', '供应商', '物料', '方向', '数量', '单位', '撤销原因', '剩余可撤销', '操作人', '备注'];
  const rows = data.map((receipt) => [
    receipt.receipt_date || '',
    receipt.order_no,
    receipt.warehouse_name || '',
    receipt.location_name || receipt.location_code || '',
    receipt.supplier || '',
    receipt.item_name,
    receipt.direction === 'reversal' ? '撤销' : '入库',
    Number(receipt.quantity || 0),
    receipt.unit || '',
    receipt.reverse_reason || '',
    receipt.direction === 'reversal' ? '' : Number(receipt.reversible_quantity || 0),
    receipt.operator || '',
    receipt.remark || '',
  ]);

  downloadCsv(`采购入库记录_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportInventoryToCSV(data: InventoryItem[]) {
  if (!Array.isArray(data) || data.length === 0) return;

  const headers = ['物料编码', '物料型号', '物料名称', '分类', '总库存', '单位', '仓库', '库位编码', '库位名称', '库位库存', '常规供应商', '安全库存', '最后更新'];
  const rows = data.flatMap((item) => {
    const locations = Array.isArray(item.locations) && item.locations.length > 0
      ? item.locations
      : [{
          warehouseName: '',
          locationCode: '',
          locationName: '',
          quantity: Number(item.stock_quantity || 0),
        }];

    return locations.map((location) => [
      item.code || '',
      item.model || '',
      item.name || '',
      item.category || '',
      Number(item.stock_quantity || 0),
      item.unit || '',
      location.warehouseName || '',
      location.locationCode || '',
      location.locationName || '',
      Number(location.quantity || 0),
      item.supplier || '',
      Number(item.min_stock || 0),
      item.last_updated || '',
    ]);
  });

  downloadCsv(`库存库位余额_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportReconciliationToCSV(data: InventoryItem[]) {
  if (!Array.isArray(data) || data.length === 0) return;

  const headers = ['物料编码', '物料型号', '物料名称', '总库存', '库位汇总', '差异数量', '建议补录目标'];
  const rows = data
    .map((item) => {
      const locations = Array.isArray(item.locations) ? item.locations : [];
      const locationTotal = locations.reduce((sum, location) => sum + Number(location.quantity || 0), 0);
      const diffQuantity = Number(item.stock_quantity || 0) - locationTotal;
      const firstPositiveLocation = locations.find((location) => Number(location.quantity || 0) > 0);
      const suggestedTarget = firstPositiveLocation
        ? `${firstPositiveLocation.warehouseName || 'DEFAULT'} / ${firstPositiveLocation.locationName || firstPositiveLocation.locationCode || 'UNASSIGNED'}`
        : 'DEFAULT / UNASSIGNED';
      return [
        item.code || '',
        item.model || '',
        item.name || '',
        Number(item.stock_quantity || 0),
        locationTotal,
        diffQuantity,
        suggestedTarget,
      ];
    })
    .filter((row) => Number(row[5] || 0) !== 0);

  if (rows.length === 0) return;

  downloadCsv(`库存对账异常_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export function exportOutboundsToCSV(data: InventoryOutbound[]) {
  if (!Array.isArray(data) || data.length === 0) return;

  const headers = ['出库日期', '出库单号', '方向', '状态', '仓库', '库位编码', '库位名称', '物料编码', '物料', '数量', '单位', '用途/原因', '操作人', '备注'];
  const rows = data.flatMap((outbound) => {
    const items = Array.isArray(outbound.items) && outbound.items.length > 0
      ? outbound.items
      : [{
          material_code: '',
          item_name: '',
          quantity: '',
          unit: '',
        }];

    return items.map((item) => [
      outbound.outbound_date || '',
      outbound.outbound_no,
      outbound.direction === 'reversal' ? '冲销' : '出库',
      outbound.status === 'reversed' ? '已冲销' : '已过账',
      outbound.warehouse_name || '',
      outbound.location_code || '',
      outbound.location_name || '',
      item.material_code || '',
      item.item_name || '',
      item.quantity ?? '',
      item.unit || '',
      outbound.reason || '',
      outbound.operator || '',
      outbound.remark || '',
    ]);
  });

  downloadCsv(`正式出库记录_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}
