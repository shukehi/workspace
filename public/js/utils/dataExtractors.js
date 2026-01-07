/**
 * 数据提取工具集
 * 负责从原始订单行提取各类采购数据
 */

import { parseQuantityPair, parseHeight } from './parsers.js';

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
 * 提取锁叉采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} orderInfo - 订单汇总信息
 */
export async function extractLockForkData(orderList, orderInfo = {}) {
    // 动态加载配置
    const { LOCK_FORK_MAPPING } = await import('../config/index.js');
    const lockForkMap = {};

    // 助手：检测吊脚
    const detectHangingFeet = (xsbz) => {
        if (!xsbz || typeof xsbz !== 'string') return null;

        const keywords = LOCK_FORK_MAPPING.hangingFeet?.keywords || ['吊脚', 'diaojiao'];
        for (const keyword of keywords) {
            if (xsbz.includes(keyword)) {
                // 尝试提取数字，如 "吊脚5mm" -> 5
                const match = xsbz.match(new RegExp(`${keyword}\\s*(\\d+)`, 'i'));
                if (match) {
                    return parseInt(match[1], 10);
                }
                return 0; // 有关键字但没有数字
            }
        }
        return null;
    };

    // 助手：检测边型
    const detectEdgeType = (mb) => {
        if (!mb || typeof mb !== 'string') return null;

        const edgeTypes = LOCK_FORK_MAPPING.edgeTypes || {};
        for (const [edgeKey, edgeConfig] of Object.entries(edgeTypes)) {
            if (mb.includes(edgeKey)) {
                return edgeConfig.nameModifier;
            }
        }
        return null;
    };

    // 助手：检测锁具类型
    const detectLockType = (sj, fssj) => {
        const lockTypes = LOCK_FORK_MAPPING.lockTypes || {};

        // 检查主锁
        if (sj && lockTypes[sj]) {
            return lockTypes[sj];
        }

        // 检查副锁
        if (fssj && lockTypes[fssj]) {
            return lockTypes[fssj];
        }

        return null;
    };

    // 助手：格式化尺寸字符串
    const formatDimension = (base1, base2, adjustment = 0) => {
        const total = base1 + base2 + adjustment;
        if (adjustment === 0) {
            return `${base1}*${base2} = ${total}`;
        } else if (adjustment > 0) {
            return `${base1}*${base2} + ${adjustment} = ${total}`;
        } else {
            return `${base1}*${base2} - ${Math.abs(adjustment)} = ${total}`;
        }
    };

    orderList.forEach(item => {
        // 跳过没有锁叉的订单
        if (!item.sc || item.sc === '-' || item.sc === '无') return;

        // 1. 提取基础属性
        const parts = (item.spec || '').split('/');
        let thickness = "7"; // 默认7cm

        if (parts.length >= 2) {
            thickness = parts[1].trim();
        }

        // 2. 解析门高
        const doorHeight = parseHeight(item.spec);
        const heightReference = LOCK_FORK_MAPPING.heightReference || 2050;
        const heightAdjustment = Math.round((doorHeight - heightReference) / 2);

        // 3. 检测吊脚
        const hangingFeetValue = detectHangingFeet(item.xsbz);
        const hasHangingFeet = hangingFeetValue !== null;
        const hangingFeetAdjustment = hasHangingFeet
            ? (LOCK_FORK_MAPPING.hangingFeet?.standard || 35) - hangingFeetValue
            : 0;

        // 4. 获取基础尺寸
        const baseDimensions = LOCK_FORK_MAPPING.baseDimensions?.[thickness];
        if (!baseDimensions) {
            console.warn(`⚠️ 未找到门厚 ${thickness}cm 的锁叉基础尺寸配置`);
            return;
        }

        const dimensionType = hasHangingFeet ? 'withHangingFeet' : 'standard';
        const dimensions = baseDimensions[dimensionType];

        if (!dimensions) {
            console.warn(`⚠️ 未找到 ${dimensionType} 类型的尺寸配置`);
            return;
        }

        // 5. 检测边型和锁具类型
        const edgeModifier = detectEdgeType(item.mb);
        const lockTypeConfig = detectLockType(item.sj, item.fssj);

        // 6. 构建锁叉名称
        let lockForkName = item.sc;

        // 添加边型修饰符
        if (edgeModifier) {
            lockForkName = `${lockForkName} ${edgeModifier}`;
        }

        // 添加锁具类型修饰符
        if (lockTypeConfig?.nameModifier) {
            lockForkName = `${lockForkName} ${lockTypeConfig.nameModifier}`;
        }

        // 7. 计算尺寸
        const upperDimension = formatDimension(
            dimensions.upper.base1,
            dimensions.upper.base2,
            heightAdjustment
        );

        const lowerDimension = formatDimension(
            dimensions.lower.base1,
            dimensions.lower.base2,
            heightAdjustment + hangingFeetAdjustment
        );

        // 8. 构建规格字符串（包含上头和下头尺寸）
        const specString = `上头 = ${upperDimension}, 下头 = ${lowerDimension}`;

        // 9. 构建备注
        let finalRemark = '';
        if (lockTypeConfig?.category === 'dual-head') {
            finalRemark = `上头: ${lockTypeConfig.upper || ''}, 下头: ${lockTypeConfig.lower || ''}`;
        } else if (hasHangingFeet) {
            finalRemark = `吊脚${hangingFeetValue}mm`;
        }

        // 10. 生成唯一键（用于合并相同规格）
        const key = `${lockForkName}|${specString}|${finalRemark}`;

        const qtyPair = parseQuantityPair(item.qty);
        const totalQty = qtyPair.left + qtyPair.right;

        // 11. 合并或创建新条目
        if (lockForkMap[key]) {
            lockForkMap[key].quantity += totalQty;
        } else {
            lockForkMap[key] = {
                supplier: LOCK_FORK_MAPPING.suppliers?.default || '锁叉供应商',
                type: lockForkName,
                spec: specString,
                remark: finalRemark,
                quantity: totalQty
            };
        }
    });

    return Object.values(lockForkMap);
}

/**
 * 提取边锁采购数据（保留原有函数名以保持兼容性）
 * @param {Array} orderList - 原始订单列表
 */
export function extractLockData(orderList, orderInfo = {}) {
    // 调用新的锁叉提取函数
    return extractLockForkData(orderList, orderInfo);
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
