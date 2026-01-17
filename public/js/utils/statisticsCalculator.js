/**
 * Statistics Calculator
 * Analyzes order data to calculate color distribution and door counts
 */

import { parseQuantityPair } from './parsers.js';

/**
 * Calculate color statistics from order items
 * @param {Array} orderItems - Array of order items from order.list
 * @returns {Object} Statistics object with color distribution
 */
export function calculateColorStatistics(orderItems) {
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
        return {
            totalColors: 0,
            totalDoors: 0,
            colorDistribution: []
        };
    }

    // Map to store color -> door count
    const colorMap = new Map();

    orderItems.forEach(item => {
        const color = item.color || '未指定';

        // Parse quantity (format: "3/3" or "10")
        const qtyPair = parseQuantityPair(item.qty);
        const doorCount = qtyPair.left + qtyPair.right;

        if (colorMap.has(color)) {
            colorMap.set(color, colorMap.get(color) + doorCount);
        } else {
            colorMap.set(color, doorCount);
        }
    });

    // Calculate total doors
    const totalDoors = Array.from(colorMap.values()).reduce((sum, count) => sum + count, 0);

    // Convert to array and sort by door count (descending)
    const colorDistribution = Array.from(colorMap.entries())
        .map(([color, doorCount]) => ({
            color,
            doorCount,
            ratio: totalDoors > 0 ? (doorCount / totalDoors * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.doorCount - a.doorCount);

    return {
        totalColors: colorMap.size,
        totalDoors,
        colorDistribution
    };
}

/**
 * Get summary text for statistics
 * @param {Object} stats - Statistics object from calculateColorStatistics
 * @returns {string} Human-readable summary
 */
export function getStatisticsSummary(stats) {
    if (stats.totalColors === 0) {
        return '暂无数据';
    }

    const topColor = stats.colorDistribution[0];
    return `共 ${stats.totalColors} 种颜色，${stats.totalDoors} 个门。最多: ${topColor.color} (${topColor.doorCount}个)`;
}
