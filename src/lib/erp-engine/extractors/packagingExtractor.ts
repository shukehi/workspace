import { aggregatePackaging } from '../packagingTable';

type PackagingItems = Parameters<typeof aggregatePackaging>[0];
type PackagingMapping = Parameters<typeof aggregatePackaging>[1];

type PackagingResult = ReturnType<typeof aggregatePackaging>;

/**
 * 提取包装采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} PACKAGING_MAPPING - 注入的配置
 */
export function extractPackagingData(orderList: PackagingItems, PACKAGING_MAPPING: PackagingMapping = {}): PackagingResult {
  return aggregatePackaging(orderList, PACKAGING_MAPPING);
}
