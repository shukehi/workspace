/**
 * Data Extractors
 * 从订单明细中提取不同类别的采购数据
 */

import { aggregatePackaging } from '../components/packagingTable.js';
import { parseQuantityPair } from './parsers.js';
import { CYLINDER_MAPPING } from '../config/index.js';

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
 * @returns {Array} 锁芯数据
 */
export function extractCylinderData(orderList, orderInfo = {}) {
    const cylinderMap = {};

    orderList.forEach(item => {
        // 1. 提取门厚 (从规格字符串中)
        // 假设格式为: 宽*高/厚/...
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

        // 3. 匹配产品规则
        const internalName = item.sx || '标准锁芯';
        const productRule = CYLINDER_MAPPING.products?.find(prod => {
            return prod.matchKeywords?.every(kw => internalName.includes(kw));
        });

        if (!productRule) {
            console.warn(`未找到名称 [${internalName}] 的产品匹配规则，使用默认`);
            // 使用默认值
            const cylinderType = internalName;
            if (!cylinderMap[cylinderType]) {
                cylinderMap[cylinderType] = {
                    type: cylinderType,
                    supplier: '未知供应商',
                    grade: '标准',
                    quantity: 0,
                    remark: ''
                };
            }
            const qty = parseQuantityPair(item.qty);
            cylinderMap[cylinderType].quantity += qty.left + qty.right;
            return;
        }

        // 4. 生成外协名称 (替换模板变量)
        const externalName = productRule.template
            .replace('{code}', dimensionRule.code);

        // 5. 确定要求 (根据客户部门智能判断)
        const requirements = determineRequirements(orderInfo.customerName || '');

        // 6. 构建唯一键并聚合
        // 使用: 供应商 + 外协名称 + 偏心 作为唯一键
        const key = `${productRule.supplier}|${externalName}|${dimensionRule.eccentricity}`;

        if (!cylinderMap[key]) {
            cylinderMap[key] = {
                type: externalName,
                supplier: productRule.supplier,
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
