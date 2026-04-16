import type { Ref } from 'vue';
import type { InventoryOutbound, InventoryReceipt } from '@/types/inventory';

type ReceiptReverseControls = {
  reverseDialogOpen: Ref<boolean>;
  reverseReceiptTarget: Ref<InventoryReceipt | null>;
  reverseReason: Ref<string>;
  reverseRemark: Ref<string>;
  reverseQuantity: Ref<string>;
  reversing: Ref<boolean>;
  confirmReverseReceipt: () => Promise<void>;
};

type OutboundReverseControls = {
  reverseOutboundDialogOpen: Ref<boolean>;
  reverseOutboundTarget: Ref<InventoryOutbound | null>;
  reverseOutboundReason: Ref<string>;
  reverseOutboundRemark: Ref<string>;
  reversingOutbound: Ref<boolean>;
  confirmReverseOutbound: () => Promise<void>;
};

export function useInventoryReverseDialogs(options: {
  receipt: ReceiptReverseControls;
  outbound: OutboundReverseControls;
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
