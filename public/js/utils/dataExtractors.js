/**
 * Data Extractors
 * 从订单明细中提取不同类别的采购数据
 */

import { aggregatePackaging } from '../components/packagingTable.js';
import { parseQuantityPair } from './parsers.js';

/**
 * 提取包装数据
 * @param {Array} orderList - 订单明细列表
 * @returns {Object} 包装数据
 */
export function extractPackagingData(orderList) {
    return aggregatePackaging(orderList);
}

/**
 * 提取锁芯数据
 * @param {Array} orderList - 订单明细列表
 * @returns {Array} 锁芯数据
 */
export function extractCylinderData(orderList) {
    const cylinderMap = {};

    orderList.forEach(item => {
        // 从 sx 字段提取锁芯信息
        const cylinderType = item.sx || '标准锁芯';

        if (!cylinderMap[cylinderType]) {
            cylinderMap[cylinderType] = {
                type: cylinderType,
                grade: '标准', // 可以根据实际业务逻辑调整
                quantity: 0,
                remark: ''
            };
        }

        // 计算数量
        const qty = parseQuantityPair(item.qty);
        cylinderMap[cylinderType].quantity += qty.left + qty.right;
    });

    return Object.values(cylinderMap);
}

/**
 * 提取五金数据
 * @param {Array} orderList - 订单明细列表
 * @returns {Array} 五金数据
 */
export function extractHardwareData(orderList) {
    // TODO: 实现五金数据提取逻辑
    // 这里需要根据实际业务需求定义五金的识别规则
    return [];
}

/**
 * 提取边锁数据
 * @param {Array} orderList - 订单明细列表
 * @returns {Array} 边锁数据
 */
export function extractLockData(orderList) {
    // TODO: 实现边锁数据提取逻辑
    // 这里需要根据实际业务需求定义边锁的识别规则
    return [];
}

/**
 * 获取对应类别的数据提取器
 * @param {string} category - 类别名称
 * @returns {Function} 提取器函数
 */
export function getExtractor(category) {
    const extractors = {
        packaging: extractPackagingData,
        cylinder: extractCylinderData,
        hardware: extractHardwareData,
        lock: extractLockData
    };

    return extractors[category] || (() => []);
}
