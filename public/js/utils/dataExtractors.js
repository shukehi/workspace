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
    const customLogos = CYLINDER_MAPPING.customLogos || [];

    const cylinderMap = {};

    // Helper: Detect logo in text
    const detectLogo = (text) => {
        if (!text || typeof text !== 'string') return null;
        const upperText = text.toUpperCase();
        // Return the exact casing from the config if found
        return customLogos.find(logo => upperText.includes(logo.toUpperCase()));
    };

    orderList.forEach(item => {
        // 1. 提取门厚 和 开向 (从规格字符串中)
        const parts = (item.spec || '').split('/');
        let thickness = "7"; // 默认值
        let openDirection = "内开"; // 默认值

        if (parts.length >= 2) {
            thickness = parts[1].trim();
        }
        if (parts.length >= 3) {
            // 简单判断包含关系
            const dirPart = parts[2];
            if (dirPart.includes("外开")) openDirection = "外开";
            else if (dirPart.includes("内开")) openDirection = "内开";
        }

        // 2. 确定尺寸规则 (优先检查特殊规则)
        let dimensionRule = null;

        // 2.1 检查特殊规则 (Special Rules Override)
        const specialRules = CYLINDER_MAPPING.specialRules || [];
        for (const rule of specialRules) {
            // 检查字段是否存在且包含关键字
            // 注意: 字段名可能是 'sxhz' 但 API 返回的 item 里可能都是小写或者 mapping 需要适应
            const fieldValue = item[rule.conditionField] || '';

            // 只有当门厚也是 7 (或规则不限制门厚) 时才生效
            if (rule.thickness && rule.thickness !== thickness) continue;

            if (fieldValue && fieldValue.includes(rule.keyword)) {
                // 命中特殊规则！查找对应的开向变体
                const variant = rule.variants[openDirection];
                if (variant) {
                    dimensionRule = variant;
                    // console.log(`⚡️ 命中特殊规则: ${rule.keyword} [${openDirection}] -> ${variant.code}`);
                    break; // 找到一个即停止
                }
            }
        }

        // 2.2 如果没命中特殊规则，使用标准尺寸表
        if (!dimensionRule) {
            dimensionRule = CYLINDER_MAPPING.dimensions?.[thickness];
        }

        if (!dimensionRule) {
            console.warn(`未找到门厚 [${thickness}] 的尺寸定义，跳过`);
            return;
        }

        // 3. Detect Logo (Check item remark -> Order remark -> Customer Name)
        const logo = detectLogo(item.xsbz) ||
            detectLogo(orderInfo.remark) ||
            detectLogo(orderInfo.customerName);

        // 4. 获取内部名称并查找映射
        const internalName = item.sx || '标准锁芯';
        const mapping = CYLINDER_MAPPING.mappings?.[internalName];

        if (!mapping) {
            console.warn(`未找到锁芯 [${internalName}] 的映射配置，使用默认值`);

            // Build key with logo isolation
            const key = `${internalName}|${logo || ''}`;

            if (!cylinderMap[key]) {
                let req = determineRequirements(orderInfo.customerName || '');
                if (logo) req += ` (刻 ${logo} 标)`;

                cylinderMap[key] = {
                    internalName: internalName,  // 内部名称
                    type: internalName,           // 默认情况下，外协名称=内部名称
                    supplier: '未知供应商',
                    eccentricity: dimensionRule.eccentricity,
                    grade: '标准',
                    quantity: 0,
                    remark: req
                };
            }
            const qty = parseQuantityPair(item.qty);
            cylinderMap[key].quantity += qty.left + qty.right;
            return;
        }

        // 5. 生成外协名称 (替换模板变量)
        const externalName = mapping.template.replace('{code}', dimensionRule.code);

        // 6. 确定要求 (根据客户部门智能判断 + Logo)
        let requirements = determineRequirements(orderInfo.customerName || '');
        if (logo) {
            requirements += ` (刻 ${logo} 标)`;
        }

        // 7. 构建唯一键并聚合 (加入 logo 隔离)
        const key = `${mapping.supplier}|${externalName}|${dimensionRule.eccentricity}|${logo || ''}`;

        if (!cylinderMap[key]) {
            cylinderMap[key] = {
                internalName: internalName,  // 内部名称（订单中的锁芯名称）
                type: externalName,           // 外协名称（生成的采购名称）
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
