import {
  exportInventoryToCSV,
  exportOutboundsToCSV,
  exportReceiptsToCSV,
  exportReconciliationToCSV,
} from '@/features/inventory/inventoryCsvExports';

export function createInventoryExportActions() {
  return {
    exportReceiptsToCSV,
    exportInventoryToCSV,
    exportReconciliationToCSV,
    exportOutboundsToCSV,
  };
}
