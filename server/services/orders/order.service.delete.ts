import { sequelize } from '../../models';
import * as orderRepository from './order.repository';

function isBusyError(error: unknown) {
  const record = (error || {}) as { name?: unknown; message?: unknown };
  return record?.name === 'SequelizeTimeoutError'
    || String(record?.message || '').includes('SQLITE_BUSY');
}

export async function deleteOrderWithRetry(orderId: number, maxAttempts = 3): Promise<number> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const transaction = await sequelize.transaction();
    try {
      await orderRepository.destroyIdempotencyKeysByOrderId(orderId, transaction);
      await orderRepository.destroyOrderItemsByOrderId(orderId, transaction);
      const deleted = await orderRepository.destroyOrderById(orderId, transaction);
      await transaction.commit();
      return deleted;
    } catch (error) {
      await transaction.rollback();
      if (isBusyError(error) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 80 * attempt));
        continue;
      }
      throw error;
    }
  }

  return 0;
}
