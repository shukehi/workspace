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
 * @param {Object} orderInfo - 订单信息 (包含客户名称等)
 * @returns {Promise<Array>} 锁芯数据
 */
export async function extractCylinderData(orderList, orderInfo = {}) {
    // Dynamically import to ensure config is loaded
    const { CYLINDER_MAPPING } = await import('../config/index.js');

    const cylinderMap = {};

    orderList.forEach(item => {
        // 1. 提取门厚 (从规格字符串中)
        const parts = (item.spec || '').split('/');
        let thickness = "7"; // 默认值
        if (parts.length >= 2) {
            thickness = parts[1].trim();
        }

        // 2. 查尺寸表
        const dimensionRule = CYLINDER_MAPPING.dimensions?.[thickness];
        if (!dimensionRule) {
            console.warn(`未找到门厚 [${thickness}] 的尺寸定义，跳过`);
            return;
        }

        // 3. 获取内部名称并查找映射
        const internalName = item.sx || '标准锁芯';
        const mapping = CYLINDER_MAPPING.mappings?.[internalName];

        if (!mapping) {
            console.warn(`未找到锁芯 [${internalName}] 的映射配置，使用默认值`);
            // 使用默认值
            const key = internalName;
            if (!cylinderMap[key]) {
                cylinderMap[key] = {
                    type: internalName,
                    supplier: '未知供应商',
                    eccentricity: dimensionRule.eccentricity,
                    grade: '标准',
                    quantity: 0,
                    remark: determineRequirements(orderInfo.customerName || '')
                };
            }
            const qty = parseQuantityPair(item.qty);
            cylinderMap[key].quantity += qty.left + qty.right;
            return;
        }

        // 4. 生成外协名称 (替换模板变量)
        const externalName = mapping.template.replace('{code}', dimensionRule.code);

        // 5. 确定要求 (根据客户部门智能判断)
        const requirements = determineRequirements(orderInfo.customerName || '');

        // 6. 构建唯一键并聚合
        const key = `${mapping.supplier}|${externalName}|${dimensionRule.eccentricity}`;

        if (!cylinderMap[key]) {
            cylinderMap[key] = {
                type: externalName,
                supplier: mapping.supplier,
                eccentricity: dimensionRule.eccentricity,
                grade: '标准',
                quantity: 0,
                remark: requirements
            };
        }

        // 计算数量
        const qty = parseQuantityPair(item.qty);
        cylinderMap[key].quantity += qty.left + qty.right;
    });

    return Object.values(cylinderMap);
}

/**
 * 根据客户名称确定锁芯要求
 * @param {string} customerName - 客户名称
 * @returns {string} 要求描述
 */
function determineRequirements(customerName) {
    let keyConfig = "钥匙 2+5";
    let manualLang = "";

    if (customerName.includes("三部")) {
        manualLang = "英文说明书";
    } else if (["一部", "二部", "六部"].some(kw => customerName.includes(kw))) {
        manualLang = "中文说明书";
    } else {
        manualLang = "【请确认中/英文】";
    }

    return `${keyConfig} ${manualLang}`;
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
