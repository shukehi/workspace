/**
 * 包装汇总表模块
 * 负责聚合和展示包装采购数据
 */


// import { PACKAGING_MAPPING } from '../config/index.js';
import { parseQuantity, parseQuantityPair } from './parsers';

type PackagingItem = Record<string, any>;
type PackagingMapping = Record<string, any>;
type AggregatedPackagingRecord = {
    internalName: string;
    externalName: string;
    supplierName: string;
    spec: string;
    mb: string;
    totalLeft: number;
    totalRight: number;
    totalQty: number;
};
type AggregatedPackaging = Record<string, AggregatedPackagingRecord>;

/**
 * 聚合包装数据
 * @param {Array} items - 商品明细数组
 * @param {Object} PACKAGING_MAPPING - 注入的配置
 * @returns {Object} 聚合后的包装数据
 */
export function aggregatePackaging(items: PackagingItem[], PACKAGING_MAPPING: PackagingMapping = {}): AggregatedPackaging {
    const groups: AggregatedPackaging = {};

    if (!items || !Array.isArray(items)) {
        console.warn('aggregatePackaging received invalid items:', items);
        return {};
    }

    items.forEach((item) => {
        const internalName = item.bz || "未知";
        // mappings maps internal packaging name -> external packaging name, not supplier.
        const mappings = PACKAGING_MAPPING.mappings || PACKAGING_MAPPING;
        const supplierName = PACKAGING_MAPPING.supplierName || "方亮包装";
        const externalName = mappings[internalName] || internalName + " (未匹配)";
        const spec = item.spec || "未知规格";
        const mb = item.mb || "-";
        const qty = parseQuantity(item.qty);
        const qtyPair = parseQuantityPair(item.qty);

        // Keep edge type in grouping key so merged rows still preserve correct "门边" values.
        const groupKey = `${supplierName}|${externalName}|${spec}|${mb}`;

        if (!groups[groupKey]) {
            groups[groupKey] = {
                internalName,
                externalName,
                supplierName,
                spec,
                mb,
                totalLeft: 0,
                totalRight: 0,
                totalQty: 0
            };
        }

        groups[groupKey].totalQty += qty;
        groups[groupKey].totalLeft += qtyPair.left;
        groups[groupKey].totalRight += qtyPair.right;
    });

    return groups;
}
