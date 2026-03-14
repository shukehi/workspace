import type { Order } from '@/types/order';

/**
 * 检查订单是否有有效的交货日期
 */
export function hasValidDeliveryDate(order: Partial<Order> | null | undefined): boolean {
  const date = order?.delivery_date;
  if (!date) return false;
  const parsed = new Date(date);
  return !Number.isNaN(parsed.getTime());
}

/**
 * 打印/导出 PDF 前的业务校验
 * @returns { canProceed: boolean, message?: string }
 */
export function validateForPrinting(order: Partial<Order> | null | undefined) {
  if (!order) return { canProceed: false, message: '未找到订单数据' };
  
  if (!hasValidDeliveryDate(order)) {
    return { 
      canProceed: true, 
      needsConfirm: true,
      message: '当前订单未设置交货日期，是否继续打印/导出 PDF？' 
    };
  }
  
  return { canProceed: true, needsConfirm: false };
}

/**
 * 构建打印/导出的统一 Payload
 */
export function buildPrintPayload(order: Order, printMode: string = 'signature') {
  return {
    poNumber: order.order_no,
    category: order.category || '',
    printMode,
    order,
  };
}
