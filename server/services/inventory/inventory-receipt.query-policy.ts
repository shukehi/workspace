import { Op } from 'sequelize';

type QueryInput = Record<string, unknown>;

export function buildInventoryReceiptListQuery(query: QueryInput = {}) {
  const where: Record<string | symbol, unknown> = {};

  if (query.orderId) where.order_id = Number(query.orderId);
  if (query.orderNo) where.order_no = String(query.orderNo).trim();
  if (query.warehouseId) where.warehouse_id = Number(query.warehouseId);
  if (query.locationId) where.location_id = Number(query.locationId);
  if (query.direction && ['in', 'reversal'].includes(String(query.direction))) {
    where.direction = String(query.direction);
  }
  if (query.reverseReason) {
    where.reverse_reason = String(query.reverseReason).trim();
  }

  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where[Op.or] = [
      { order_no: { [Op.like]: `%${keyword}%` } },
      { supplier: { [Op.like]: `%${keyword}%` } },
      { item_name: { [Op.like]: `%${keyword}%` } },
      { operator: { [Op.like]: `%${keyword}%` } },
      { material_id: { [Op.like]: `%${keyword}%` } },
      { '$location.name$': { [Op.like]: `%${keyword}%` } },
      { '$location.code$': { [Op.like]: `%${keyword}%` } },
    ];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 50));

  return {
    where,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}
