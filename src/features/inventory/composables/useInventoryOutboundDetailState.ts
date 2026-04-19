import { ref } from 'vue';
import type { InventoryOutbound } from '@/types/inventory';

export function useInventoryOutboundDetailState(options: {
  fetchInventoryOutbound: (id: number | string) => Promise<InventoryOutbound>;
}) {
  const selectedOutboundDetail = ref<InventoryOutbound | null>(null);

  async function openOutboundDetail(outbound: InventoryOutbound) {
    selectedOutboundDetail.value = await options.fetchInventoryOutbound(outbound.id);
  }

  function closeOutboundDetail() {
    selectedOutboundDetail.value = null;
  }

  return {
    selectedOutboundDetail,
    openOutboundDetail,
    closeOutboundDetail,
  };
}
