import { computed, ref, watch } from 'vue';
import { prepareOrderDraft } from '@/features/procurement/prepareOrderDraft';
import type { Order } from '@/types/order';

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'question';

type ConfirmState = {
  show: boolean;
  title: string;
  message: string;
  variant: ConfirmVariant;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
};

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

type ProcurementStoreLike = {
  deleteOrder: (id: number) => Promise<void>;
  bulkDelete: (ids: number[]) => Promise<void>;
};

export function useProcurementDialogs(options: {
  store: ProcurementStoreLike;
  toast: ToastFn;
}) {
  const isEditDialogOpen = ref(false);
  const isPreviewDialogOpen = ref(false);
  const selectedOrder = ref<Order | null>(null);
  const draftOrderForPreview = ref<Order | null>(null);
  const editDialogMode = ref<'edit' | 'create'>('edit');

  const confirmState = ref<ConfirmState>({
    show: false,
    title: '',
    message: '',
    variant: 'danger',
    confirmText: '确定',
    onConfirm: () => {}
  });

  function closeConfirm() {
    confirmState.value.show = false;
  }

  function canEditOrder(order: Order | null | undefined) {
    return !!order && order.status !== 'completed';
  }

  function notifyEditLocked(order: Order) {
    options.toast({
      title: '当前订单不可编辑明细',
      description: '已入库订单已冻结明细，不能再编辑采购内容',
      variant: 'destructive'
    });
  }

  function openEdit(order: Order) {
    if (!canEditOrder(order)) {
      notifyEditLocked(order);
      return;
    }
    editDialogMode.value = 'edit';
    const draft = prepareOrderDraft(order);
    selectedOrder.value = draft;
    draftOrderForPreview.value = draft;
    isEditDialogOpen.value = true;
  }

  function openEditInternal(order: Order) {
    if (!canEditOrder(order)) {
      notifyEditLocked(order);
      return;
    }
    editDialogMode.value = 'edit';
    const draft = prepareOrderDraft(order);
    selectedOrder.value = draft;
    draftOrderForPreview.value = draft;
    isEditDialogOpen.value = true;
  }

  function openPreview(order: Order) {
    const draft = prepareOrderDraft(order);
    selectedOrder.value = draft;
    draftOrderForPreview.value = draft;
    isPreviewDialogOpen.value = true;
  }

  function openManualEntry() {
    editDialogMode.value = 'create';
    selectedOrder.value = null;
    draftOrderForPreview.value = null;
    isEditDialogOpen.value = true;
  }

  function syncDraftForPreview(draft: Order) {
    if (!selectedOrder.value || selectedOrder.value.id !== draft.id) return;
    draftOrderForPreview.value = draft;
  }

  function previewDraft(draft: Order) {
    const normalizedDraft = prepareOrderDraft(draft);
    selectedOrder.value = normalizedDraft;
    draftOrderForPreview.value = normalizedDraft;
    isPreviewDialogOpen.value = true;
  }

  function editFromPreview(order: Order) {
    if (!canEditOrder(order)) {
      notifyEditLocked(order);
      return;
    }
    isPreviewDialogOpen.value = false;
    openEditInternal(order);
  }

  const previewOrder = computed(() => {
    if (!selectedOrder.value) return null;
    if (draftOrderForPreview.value && draftOrderForPreview.value.id === selectedOrder.value.id) {
      return draftOrderForPreview.value;
    }
    return selectedOrder.value;
  });

  watch(isEditDialogOpen, (open) => {
    if (!open) {
      draftOrderForPreview.value = null;
    }
  });

  function requestDelete(order: Order) {
    confirmState.value = {
      show: true,
      title: '删除确认',
      message: `您确定要永久删除订单 <span class="font-bold text-foreground">${order.order_no}</span> 吗？此操作将无法还原数据。`,
      variant: 'danger',
      confirmText: '确认删除',
      onConfirm: async () => {
        try {
          await options.store.deleteOrder(order.id);
          options.toast({ title: '订单已删除', variant: 'success' });
        } catch {
          options.toast({ title: '删除失败', variant: 'destructive' });
        } finally {
          closeConfirm();
        }
      }
    };
  }

  function requestBulkDelete(selectedRows: Order[], clearSelection: () => void) {
    const count = selectedRows.length;
    confirmState.value = {
      show: true,
      title: '批量删除订单',
      message: `您即将永久删除选中的 ${count} 张采购单。确定要继续吗？`,
      variant: 'danger',
      confirmText: '批量删除',
      onConfirm: async () => {
        try {
          await options.store.bulkDelete(selectedRows.map((order) => order.id));
          clearSelection();
          options.toast({
            title: '批量删除成功',
            description: `已移除 ${count} 张订单`,
            variant: 'success'
          });
        } catch {
          options.toast({ title: '操作失败', variant: 'destructive' });
        } finally {
          closeConfirm();
        }
      }
    };
  }

  return {
    isEditDialogOpen,
    isPreviewDialogOpen,
    selectedOrder,
    editDialogMode,
    previewOrder,
    canEditOrder,
    confirmState,
    openEdit,
    openPreview,
    openManualEntry,
    syncDraftForPreview,
    previewDraft,
    editFromPreview,
    requestDelete,
    requestBulkDelete,
  };
}
