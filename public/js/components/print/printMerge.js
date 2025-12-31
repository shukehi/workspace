/**
 * 打印合并逻辑模块
 * 负责商品项的合并判断和处理
 */

import { parseQuantityPair } from '../../utils/parsers.js';

/**
 * 尝试合并商品项
 * @param {Array} items - 商品明细数组
 * @returns {Object} { reducedList: Array, canMerge: boolean }
 */
export function tryMergeItems(items) {
    if (!items || items.length === 0) return { reducedList: [], canMerge: false };

    // Group by Packaging Type first (bz) - consistent with generatePrintPages
    const groups = {};
    items.forEach(item => {
        const pkgName = item.bz || "DEFAULT";
        if (!groups[pkgName]) groups[pkgName] = [];
        groups[pkgName].push(item);
    });

    let finalList = [];
    let mergeCount = 0;

    // Process each packaging group
    for (const pkgName in groups) {
        const groupItems = groups[pkgName];

        const independentItems = [];
        const mergeableBuckets = {}; // Key -> Array of items

        groupItems.forEach(item => {
            if (!item._allowMerge) {
                independentItems.push(item);
            } else {
                // Create a unique key for merging: Spec + MB (Wall) + SX (Direction)
                const key = `${item.spec}|${item.mb}|${item.sx}`;

                if (!mergeableBuckets[key]) {
                    mergeableBuckets[key] = [];
                }
                mergeableBuckets[key].push(item);
            }
        });

        // Add independent items to final list
        finalList = finalList.concat(independentItems);

        // Process buckets
        for (const key in mergeableBuckets) {
            const bucket = mergeableBuckets[key];
            if (bucket.length === 1) {
                // Only one item, no merge needed
                finalList.push(bucket[0]);
            } else {
                // Merge these items!
                mergeCount++; // We found a group that reduces N items to 1

                // Base item is the first one
                const mergedItem = JSON.parse(JSON.stringify(bucket[0]));

                let totalLeft = 0;
                let totalRight = 0;
                const productNames = new Set();
                const remarks = new Set();

                bucket.forEach(subItem => {
                    const q = parseQuantityPair(subItem.qty);
                    totalLeft += q.left;
                    totalRight += q.right;

                    if (subItem.productModelName) productNames.add(subItem.productModelName);
                    if (subItem.xsbz) remarks.add(subItem.xsbz);
                });

                // Update merged item properties
                mergedItem.qty = `${totalLeft}/${totalRight}`; // Reconstruct qty string
                mergedItem.productModelName = Array.from(productNames).join('/'); // Join names

                // Mark as merged for potential UI highlighting (optional)
                mergedItem._isMerged = true;

                finalList.push(mergedItem);
            }
        }
    }

    return {
        reducedList: finalList,
        canMerge: mergeCount > 0
    };
}
