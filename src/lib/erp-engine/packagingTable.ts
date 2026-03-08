/**
 * 包装汇总表模块
 * 负责聚合和展示包装采购数据
 */

import { adaptPackagingMapping } from '@/services/mappings';

// import { PACKAGING_MAPPING } from '../config/index.js';
import { parseQuantity, parseQuantityPair } from './parsers';

type PackagingItem = Record<string, any>;
type PackagingMapping = Record<string, any>;
type AggregatedPackagingRecord = {
    internalName: string;
    externalName: string;
    productModelName: string;
    supplierName: string;
    spec: string;
    mb: string;
    totalLeft: number;
    totalRight: number;
    totalQty: number;
};
type AggregatedPackaging = Record<string, AggregatedPackagingRecord>;

function normalizeProductNames(raw: string): string[] {
    if (!raw) return [];

    const lines = raw
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean);

    if (lines.length <= 1 && raw.includes(' / ')) {
        return raw
            .split(/\s+\/\s+/)
            .map((name) => name.trim())
            .filter(Boolean);
    }

    return lines;
}

/**
 * 聚合包装数据
 * @param {Array} items - 商品明细数组
 * @param {Object} PACKAGING_MAPPING - 注入的配置
 * @returns {Object} 聚合后的包装数据
 */
export function aggregatePackaging(items: PackagingItem[], PACKAGING_MAPPING: PackagingMapping = {}): AggregatedPackaging {
    const groups: AggregatedPackaging = {};
    const packagingConfig = adaptPackagingMapping(PACKAGING_MAPPING);
    const mappings = packagingConfig.mappings;
    const supplierName = packagingConfig.supplierName || "方亮包装";

    if (!items || !Array.isArray(items)) {
        console.warn('aggregatePackaging received invalid items:', items);
        return {};
    }

    items.forEach((item) => {
        const rawInternalName = String(item?.bz || '').trim();
        const internalName = rawInternalName || "未匹配";
        const externalName = rawInternalName
            ? (mappings[internalName] || `${internalName} (未匹配)`)
            : "未匹配";
        const productModelName = String(item.productModelName || '').trim();
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
                productModelName,
                supplierName,
                spec,
                mb,
                totalLeft: 0,
                totalRight: 0,
                totalQty: 0
            };
        }

        if (productModelName) {
            const current = groups[groupKey].productModelName;
            if (!current) {
                groups[groupKey].productModelName = productModelName;
            } else {
                const names = normalizeProductNames(current);
                if (!names.includes(productModelName)) {
                    groups[groupKey].productModelName = [...names, productModelName].join('\n');
                }
            }
        }

        groups[groupKey].totalQty += qty;
        groups[groupKey].totalLeft += qtyPair.left;
        groups[groupKey].totalRight += qtyPair.right;
    });

    return groups;
}
