import type { InventoryReceiptReverseControls } from '@/features/inventory/composables/useInventoryReceiptFlow';
import type { InventoryOutboundReverseControls } from '@/features/inventory/composables/useInventoryOutboundState';
import type { InventoryOutbound } from '@/types/inventory';

export function useInventoryReverseDialogs(options: {
  receipt: InventoryReceiptReverseControls;
  outbound: InventoryOutboundReverseControls;
}) {
  function requestReverseOutbound(outbound: InventoryOutbound) {
    options.outbound.reverseOutboundTarget.value = outbound;
    options.outbound.reverseOutboundReason.value = '出库冲销';
    options.outbound.reverseOutboundRemark.value = '';
    options.outbound.reverseOutboundDialogOpen.value = true;
  }

  function resetReceiptReverseQuantityToMax() {
    options.receipt.reverseQuantity.value = String(options.receipt.reverseReceiptTarget.value?.reversible_quantity || '');
  }

  return {
    requestReverseOutbound,
    resetReceiptReverseQuantityToMax,
    reverseDialogOpen: options.receipt.reverseDialogOpen,
    reverseReceiptTarget: options.receipt.reverseReceiptTarget,
    reverseReason: options.receipt.reverseReason,
    reverseRemark: options.receipt.reverseRemark,
    reverseQuantity: options.receipt.reverseQuantity,
    reversing: options.receipt.reversing,
    confirmReverseReceipt: options.receipt.confirmReverseReceipt,
    reverseOutboundDialogOpen: options.outbound.reverseOutboundDialogOpen,
    reverseOutboundTarget: options.outbound.reverseOutboundTarget,
    reverseOutboundReason: options.outbound.reverseOutboundReason,
    reverseOutboundRemark: options.outbound.reverseOutboundRemark,
    reversingOutbound: options.outbound.reversingOutbound,
    confirmReverseOutbound: options.outbound.confirmReverseOutbound,
  };
}
