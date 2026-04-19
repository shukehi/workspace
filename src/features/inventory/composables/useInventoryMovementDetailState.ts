import { computed, ref } from 'vue';
import type { InventoryItem, InventoryMovement } from '@/types/inventory';

export function useInventoryMovementDetailState(options: {
  sortedMovements: () => InventoryMovement[];
  movementsTotal: () => number;
  fetchInventoryMovements: (params: { materialId: number | string; page: number; pageSize: number }) => Promise<unknown>;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
}) {
  const selectedMovementItem = ref<InventoryItem | null>(null);

  const selectedMovementSummary = computed(() => {
    if (!selectedMovementItem.value) return null;
    const rows = options.sortedMovements();
    const netChange = rows.reduce((sum, row) => sum + Number(row.delta_quantity || 0), 0);
    const lastMovement = rows[0];
    return {
      total: options.movementsTotal(),
      netChange,
      lastOccurredAt: lastMovement?.occurred_at || lastMovement?.created_at || '',
    };
  });

  function formatMovementSourceLabel(sourceType: InventoryMovement['source_type']) {
    if (sourceType === 'manual_adjustment') return '手工调账';
    if (sourceType === 'receipt_in') return '采购入库';
    if (sourceType === 'receipt_reversal') return '入库撤销';
    if (sourceType === 'outbound') return '正式出库';
    if (sourceType === 'outbound_reversal') return '出库冲销';
    return sourceType || '-';
  }

  async function openMovementSheet(item: InventoryItem) {
    selectedMovementItem.value = item;
    try {
      await options.fetchInventoryMovements({
        materialId: item.id,
        page: 1,
        pageSize: 20,
      });
    } catch {
      selectedMovementItem.value = null;
      options.toast({
        title: '轨迹加载失败',
        description: '无法获取该物料的库存变动记录，请稍后重试',
        variant: 'destructive',
      });
    }
  }

  function closeMovementSheet() {
    selectedMovementItem.value = null;
  }

  return {
    selectedMovementItem,
    selectedMovementSummary,
    formatMovementSourceLabel,
    openMovementSheet,
    closeMovementSheet,
  };
}
