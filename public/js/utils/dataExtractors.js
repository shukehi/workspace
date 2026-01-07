/**
 * 数据提取工具集
 * 负责从原始订单行提取各类采购数据
 */

import { parseQuantityPair } from './parsers.js';

/**
 * 提取锁芯采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} orderInfo - 订单汇总信息（包含 customerName, remark 等）
 */
export async function extractCylinderData(orderList, orderInfo = {}) {
    // 动态加载配置
    const { CYLINDER_MAPPING } = await import('../config/index.js');
    const customLogos = CYLINDER_MAPPING.customLogos || [];
    const cylinderMap = {};

    // 助手：检测文本中的 Logo
    const detectLogo = (text) => {
        if (!text || typeof text !== 'string') return null;
        const upperText = text.toUpperCase();
        return customLogos.find(logo => upperText.includes(logo.toUpperCase()));
    };

    // 助手：确定钥匙配置（基于客户部门和锁芯型号）
    const determineKeyConfig = (cylinderName, customerName) => {
        // 规则1：基于客户部门
        if (customerName) {
            if (customerName.includes("三部")) {
                // 三部客户：特定锁芯型号使用 1+5
                if (cylinderName === "ZH-微珠锌合金MAN") {
                    return "钥匙 1+5 英文说明书";
                }
                return "钥匙 2+5 英文说明书";
            }
            if (customerName.includes("一部") || customerName.includes("二部") || customerName.includes("六部")) {
                return "钥匙 2+5 中文说明书";
            }
        }

        // 未识别部门：提示人工确认
        return "【待确认】钥匙配置";
    };

    orderList.forEach(item => {
        // 1. 提取基础属性：门厚 和 开向 (从规格字符串中)
        const parts = (item.spec || '').split('/');
        let thickness = "7";
        let openDirection = "内开";

        if (parts.length >= 2) thickness = parts[1].trim();
        if (parts.length >= 3) {
            const dirPart = parts[2];
            if (dirPart.includes("外开")) openDirection = "外开";
            else if (dirPart.includes("内开")) openDirection = "内开";
        }

        /**
         * 核心助手：提取单个锁芯（主/副）
         * @param {string} cylinderName - 锁芯名称 (sx 或 fssx)
         * @param {string} shieldValue - 护罩值 (sxhz 或 fshz)
         * @param {string} mode - 'primary' 或 'secondary'
         */
        const process = (cylinderName, shieldValue, mode) => {
            if (!cylinderName || cylinderName === '-' || cylinderName === '无') return;

            let dimensionRule = null;
            let specialRemark = "";

            // A. 选择规则集
            const specialRules = mode === 'secondary'
                ? (CYLINDER_MAPPING.secondarySpecialRules || [])
                : (CYLINDER_MAPPING.specialRules || []);

            const standardDimensions = mode === 'secondary'
                ? CYLINDER_MAPPING.secondaryDimensions
                : CYLINDER_MAPPING.dimensions;

            // B. 匹配特殊规则
            for (const rule of specialRules) {
                if (rule.thickness && rule.thickness !== thickness) continue;
                if (shieldValue && shieldValue.includes(rule.keyword)) {
                    const variant = rule.variants[openDirection];
                    if (variant) {
                        dimensionRule = variant;
                        specialRemark = variant.remark || "";
                        break;
                    }
                }
            }

            // C. 匹配标准尺寸
            if (!dimensionRule && standardDimensions) {
                const standard = standardDimensions[thickness];
                if (standard) {
                    if (standard.variants) {
                        const variant = standard.variants[openDirection];
                        if (variant) {
                            dimensionRule = variant;
                            specialRemark = variant.remark || "";
                        }
                    } else {
                        dimensionRule = standard;
                    }
                }
            }

            if (!dimensionRule) return;

            // D. 获取 Logo
            const logo = detectLogo(item.xsbz) ||
                detectLogo(orderInfo.remark) ||
                detectLogo(orderInfo.customerName);

            // E. 获取映射
            const mapping = CYLINDER_MAPPING.mappings?.[cylinderName] || {
                supplier: "未知供应商",
                template: `{code}${cylinderName}`
            };

            // F. 组装数据
            let externalName = mapping.template.replace('{code}', dimensionRule.code);
            let finalRemark = specialRemark;

            // 添加钥匙配置
            if (mode === 'secondary') {
                const keySuffix = "5A钥匙";
                finalRemark = finalRemark ? `${finalRemark}, ${keySuffix}` : keySuffix;
                externalName = `(副) ${externalName}`;
            } else {
                // 主锁芯：根据型号和客户部门动态确定钥匙配置
                const keySuffix = determineKeyConfig(cylinderName, orderInfo.customerName);
                finalRemark = finalRemark ? `${finalRemark}, ${keySuffix}` : keySuffix;
            }

            if (logo) {
                finalRemark = finalRemark ? `${finalRemark}, (刻 ${logo} 标)` : `(刻 ${logo} 标)`;
            }

            const qtyPair = parseQuantityPair(item.qty);
            const totalQty = qtyPair.left + qtyPair.right;

            const key = `${mapping.supplier}|${externalName}|${dimensionRule.eccentricity}|${finalRemark}`;

            if (cylinderMap[key]) {
                cylinderMap[key].quantity += totalQty;
            } else {
                cylinderMap[key] = {
                    supplier: mapping.supplier,
                    type: externalName,
                    eccentricity: dimensionRule.eccentricity,
                    remark: finalRemark,
                    quantity: totalQty
                };
            }
        };

        // 处理主锁
        process(item.sx, item.sxhz || '', 'primary');
        // 处理副锁
        process(item.fssx, item.fshz || '', 'secondary');
    });

    return Object.values(cylinderMap);
}

/**
 * 提取包装采购数据
 * @param {Array} orderList - 原始订单列表
 */
export async function extractPackagingData(orderList) {
    // Import aggregatePackaging from packagingTable
    const { aggregatePackaging } = await import('../components/packagingTable.js');
    return aggregatePackaging(orderList);
}

/**
 * 提取五金采购数据
 * @param {Array} orderList - 原始订单列表
 */
export function extractHardwareData(orderList) {
    // TODO: 实现五金数据提取逻辑
    return [];
}

/**
 * 提取边锁采购数据
 * @param {Array} orderList - 原始订单列表
 */
export function extractLockData(orderList) {
    // TODO: 实现边锁数据提取逻辑
    return [];
}

/**
 * 根据类别获取对应的数据提取器
 * @param {string} category - 类别 (packaging, cylinder, hardware, lock)
 * @returns {Function} 提取器函数
 */
export function getExtractor(category) {
    const extractors = {
        packaging: extractPackagingData,
        cylinder: extractCylinderData,
        hardware: extractHardwareData,
        lock: extractLockData
    };

    return extractors[category] || null;
}
