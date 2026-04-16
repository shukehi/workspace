import { aggregatePackaging } from '../packagingTable';

type OrderItem = Record<string, any>;
type GenericMap = Record<string, any>;

/**
 * 提取包装采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} PACKAGING_MAPPING - 注入的配置
 */
export function extractPackagingData(orderList: OrderItem[], PACKAGING_MAPPING: GenericMap) {
  return aggregatePackaging(orderList, PACKAGING_MAPPING);
}
