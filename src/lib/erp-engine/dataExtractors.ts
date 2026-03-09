/**
 * 数据提取工具集
 * 负责从原始订单行提取各类采购数据
 */



import { parseQuantityPair, parseHeight } from './parsers';
import { aggregatePackaging } from './packagingTable';

type OrderItem = Record<string, any>;
type GenericMap = Record<string, any>;
type CylinderResultRow = {
    supplier: string;
    type: string;
    eccentricity: string;
    remark: string;
    quantity: number;
};
type LockForkResultRow = {
    supplier: string;
    type: string;
    spec: string;
    remark: string;
    quantity: number;
};
type HandleResultRow = {
    supplier: string;
    type: string;
    spec: string;
    remark: string;
    quantityLeft: number;
    quantityRight: number;
    quantity: number;
};

/**
 * 提取锁芯采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} orderInfo - 订单汇总信息（包含 customerName, remark 等）
 * @param {Object} CYLINDER_MAPPING - 注入的配置
 */
export function extractCylinderData(orderList: OrderItem[], orderInfo: GenericMap = {}, CYLINDER_MAPPING: GenericMap = {}): CylinderResultRow[] {
    // 动态加载配置
    // const { CYLINDER_MAPPING } = await import('../config/index.js');
    const customLogos = CYLINDER_MAPPING.customLogos || [];
    const cylinderMap: Record<string, CylinderResultRow> = {};
    const unmatchedCylinderMap: Record<string, { count: number; samples: Set<string> }> = {};

    // 助手：检测文本中的 Logo
    const detectLogo = (text: unknown): string | undefined => {

        if (!text || typeof text !== 'string') return undefined;
        const upperText = text.toUpperCase();
        return (customLogos as string[]).find((logo: string) => upperText.includes(logo.toUpperCase()));
    };

    // 助手：确定钥匙配置（基于客户部门和锁芯型号）
    const determineKeyConfig = (cylinderName: string, customerName: string) => {
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

    // 内置锁芯不参与采购生成，支持配置并保留默认兜底
    const normalizeCylinderName = (value: unknown) => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[（【［]/g, '(')
        .replace(/[）】］]/g, ')')
        .replace(/\s+/g, '');

    const hasExcludedCylinders = CYLINDER_MAPPING
        && typeof CYLINDER_MAPPING === 'object'
        && Object.prototype.hasOwnProperty.call(CYLINDER_MAPPING, 'excludedCylinders');
    const rawExcludedList = hasExcludedCylinders
        ? (Array.isArray(CYLINDER_MAPPING.excludedCylinders) ? CYLINDER_MAPPING.excludedCylinders : [])
        : ['指纹锁配套锁芯'];
    const excludedCylinders = new Set<string>(
        rawExcludedList
            .map((item: unknown) => normalizeCylinderName(item))
            .filter(Boolean)
    );

    const isBuiltInCylinder = (value: unknown) => excludedCylinders.has(normalizeCylinderName(value));

    orderList.forEach((item) => {
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
        const process = (cylinderName: string, shieldValue: string, mode: 'primary' | 'secondary') => {
            if (!cylinderName || cylinderName === '-' || cylinderName === '无') return;
            if (isBuiltInCylinder(cylinderName)) return;

            let dimensionRule: GenericMap | null = null;
            let specialRemark = "";

            // A. 选择规则集
            const specialRules = mode === 'secondary'
                ? (CYLINDER_MAPPING.secondarySpecialRules || [])
                : (CYLINDER_MAPPING.specialRules || []);

            const standardDimensions = mode === 'secondary'
                ? CYLINDER_MAPPING.secondaryDimensions
                : CYLINDER_MAPPING.dimensions;

            // B. 匹配特殊规则
            for (const rule of specialRules as GenericMap[]) {
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
            const mappingFromConfig = CYLINDER_MAPPING.mappings?.[cylinderName];
            const mapping = mappingFromConfig || {
                supplier: "未知供应商",
                template: `{code}${cylinderName}`
            };

            if (!mappingFromConfig) {
                if (!unmatchedCylinderMap[cylinderName]) {
                    unmatchedCylinderMap[cylinderName] = {
                        count: 0,
                        samples: new Set()
                    };
                }
                unmatchedCylinderMap[cylinderName].count += 1;
                if (item.spec) unmatchedCylinderMap[cylinderName].samples.add(item.spec);
            }

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

    const unmatchedEntries = Object.entries(unmatchedCylinderMap);
    if (unmatchedEntries.length > 0) {
        const summary = unmatchedEntries
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([name, info]) => ({
                cylinderName: name,
                count: info.count,
                sampleSpecs: Array.from(info.samples).slice(0, 3)
            }));
        console.warn('⚠️ [CylinderMapping] 未命中锁芯映射（TOP 10）:', summary);
    }

    return Object.values(cylinderMap);
}

/**
 * 提取包装采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} PACKAGING_MAPPING - 注入的配置
 */
export function extractPackagingData(orderList: OrderItem[], PACKAGING_MAPPING: GenericMap) {
    // connect to imported function
    return aggregatePackaging(orderList, PACKAGING_MAPPING);
}

/**
 * 提取锁叉采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} orderInfo - 订单汇总信息
 * @param {Object} LOCK_FORK_MAPPING - 注入的配置
 */
export function extractLockForkData(orderList: OrderItem[], orderInfo: GenericMap = {}, LOCK_FORK_MAPPING: GenericMap = {}): LockForkResultRow[] {
    // 动态加载配置
    // const { LOCK_FORK_MAPPING } = await import('../config/index.js');
    const lockForkMap: Record<string, LockForkResultRow> = {};

    // 助手：检测吊脚
    const detectHangingFeet = (xsbz: unknown): number | null => {
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

    // 助手：检测平下档
    const detectFlatBottomRail = (xsbz: unknown): string | null => {
        if (!xsbz || typeof xsbz !== 'string') return null;

        if (xsbz.includes('平下档')) {
            // 尝试提取完整文本，如 "4CM平下档" -> "4CM平下档"
            const match = xsbz.match(/(\d+(?:\.\d+)?CM平下档)/i);
            if (match) {
                return match[1]; // 返回 "4CM平下档"
            }
            return '平下档'; // 有关键字但没有尺寸
        }
        return null;
    };

    // 助手：检测边型
    const detectEdgeType = (mb: unknown): string | null => {
        if (!mb || typeof mb !== 'string') return null;

        const edgeTypes = LOCK_FORK_MAPPING.edgeTypes || {};
        for (const [edgeKey, edgeConfig] of Object.entries(edgeTypes as GenericMap)) {
            if (mb.includes(edgeKey)) {
                return (edgeConfig as GenericMap).nameModifier || null;
            }
        }
        return null;
    };

    // 助手：检测锁具类型
    const detectLockType = (sj: unknown, fssj: unknown): GenericMap | null => {
        const lockTypes = LOCK_FORK_MAPPING.lockTypes || {};

        // 检查主锁
        if (typeof sj === 'string' && lockTypes[sj]) {
            return lockTypes[sj];
        }

        // 检查副锁
        if (typeof fssj === 'string' && lockTypes[fssj]) {
            return lockTypes[fssj];
        }

        return null;
    };

    // 助手：格式化尺寸字符串
    const formatDimension = (base1: number, base2: number, adjustment = 0): string => {
        const total = base1 + base2 + adjustment;
        if (adjustment === 0) {
            return `${base1}*${base2} = ${total}`;
        } else if (adjustment > 0) {
            return `${base1}*${base2} + ${adjustment} = ${total}`;
        } else {
            return `${base1}*${base2} - ${Math.abs(adjustment)} = ${total}`;
        }
    };

    orderList.forEach((item) => {
        // 跳过没有锁叉的订单
        if (!item.sc || item.sc === '-' || item.sc === '无') return;

        // 1. 提取基础属性
        const parts = (item.spec || '').split('/');
        const specThickness = parts.length >= 2 ? parts[1].trim() : '';
        const rawThickness = String((item as any)?.mshd || '').trim();
        // `spec` is the visible contract thickness and should win when fixture or source rows are partially edited.
        let thickness = specThickness || rawThickness || '7';

        // 2. 解析门高
        const doorHeight = parseHeight(item.spec);
        const heightReference = LOCK_FORK_MAPPING.heightReference || 2050;
        const heightAdjustment = Math.round((doorHeight - heightReference) / 2);

        // 3. 检测平下档和吊脚（互斥）
        const flatBottomRail = detectFlatBottomRail(item.xsbz);
        const hasFlatBottomRail = flatBottomRail !== null;

        const hangingFeetValue = hasFlatBottomRail ? null : detectHangingFeet(item.xsbz);
        const hasHangingFeet = hangingFeetValue !== null;
        const hangingFeetAdjustment = hasHangingFeet
            ? (LOCK_FORK_MAPPING.hangingFeet?.standard || 35) - hangingFeetValue
            : 0;

        // 4. 获取基础尺寸
        let baseDimensions = LOCK_FORK_MAPPING.baseDimensions?.[thickness];
        if (!baseDimensions && thickness === '5') {
            baseDimensions = LOCK_FORK_MAPPING.baseDimensions?.['7'];
        }
        if (!baseDimensions) {
            console.warn(`⚠️ 未找到门厚 ${thickness}cm 的锁叉基础尺寸配置`);
            return;
        }


        // 平下档或吊脚都使用 withHangingFeet 尺寸（下头 base2 = 313）
        const dimensionType = (hasFlatBottomRail || hasHangingFeet) ? 'withHangingFeet' : 'standard';
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

        // 8. 构建锁叉名称（基础部分）
        let baseName = item.sc; // 如 "单头锁叉"

        // 添加边型修饰符（如果有）
        if (edgeModifier) {
            baseName = `${baseName} ${edgeModifier}`; // "单头锁叉 T型"
        }

        // 9. 构建锁具类型后缀
        let lockSuffix = '';
        if (lockTypeConfig?.nameModifier && lockTypeConfig.category !== 'dual-head') {
            lockSuffix = lockTypeConfig.nameModifier; // "P66"
        }

        // 10. 构建备注（包含门厚和门高）
        let remarkParts = [`${thickness}CM ${doorHeight}`];

        if (hasFlatBottomRail) {
            remarkParts.push(flatBottomRail); // "4CM平下档" 或 "平下档"
        } else if (hasHangingFeet) {
            remarkParts.push(`吊脚${hangingFeetValue}mm`);
        }

        let remarkText = remarkParts.join(', ');

        const qtyPair = parseQuantityPair(item.qty);
        const totalQty = qtyPair.left + qtyPair.right;

        // 11. 生成上头和下头两条记录
        if (lockTypeConfig?.category === 'dual-head') {
            // 双头锁叉（直杆/弯杆）
            const upperName = `${baseName} - 上头 ${lockTypeConfig.upper || ''}`.trim();
            const lowerName = `${baseName} - 下头 ${lockTypeConfig.lower || ''}`.trim();

            const upperKey = `${upperName}|${upperDimension}|${remarkText}`;
            const lowerKey = `${lowerName}|${lowerDimension}|${remarkText}`;

            // 上头
            if (lockForkMap[upperKey]) {
                lockForkMap[upperKey].quantity += totalQty;
            } else {
                lockForkMap[upperKey] = {
                    supplier: LOCK_FORK_MAPPING.suppliers?.default || '锁叉供应商',
                    type: upperName,
                    spec: upperDimension,
                    remark: remarkText,
                    quantity: totalQty
                };
            }

            // 下头
            if (lockForkMap[lowerKey]) {
                lockForkMap[lowerKey].quantity += totalQty;
            } else {
                lockForkMap[lowerKey] = {
                    supplier: LOCK_FORK_MAPPING.suppliers?.default || '锁叉供应商',
                    type: lowerName,
                    spec: lowerDimension,
                    remark: remarkText,
                    quantity: totalQty
                };
            }
        } else {
            // 标准锁叉或P66
            const upperName = lockSuffix
                ? `${baseName} - 上头 ${lockSuffix}`
                : `${baseName} - 上头`;
            const lowerName = lockSuffix
                ? `${baseName} - 下头 ${lockSuffix}`
                : `${baseName} - 下头`;

            const upperKey = `${upperName}|${upperDimension}|${remarkText}`;
            const lowerKey = `${lowerName}|${lowerDimension}|${remarkText}`;

            // 上头
            if (lockForkMap[upperKey]) {
                lockForkMap[upperKey].quantity += totalQty;
            } else {
                lockForkMap[upperKey] = {
                    supplier: LOCK_FORK_MAPPING.suppliers?.default || '锁叉供应商',
                    type: upperName,
                    spec: upperDimension,
                    remark: remarkText,
                    quantity: totalQty
                };
            }

            // 下头
            if (lockForkMap[lowerKey]) {
                lockForkMap[lowerKey].quantity += totalQty;
            } else {
                lockForkMap[lowerKey] = {
                    supplier: LOCK_FORK_MAPPING.suppliers?.default || '锁叉供应商',
                    type: lowerName,
                    spec: lowerDimension,
                    remark: remarkText,
                    quantity: totalQty
                };
            }
        }
    });

    const result = Object.values(lockForkMap);
    return result;
}

/**
 * 提取拉手采购数据
 * 规则：
 * - 根据 xsbz/ls/remark 识别单活/双活（双活优先）
 * - 根据 mshd 识别 5/7/9/10 对应配件包
 * - 型号未匹配或门厚异常时，生成“待人工处理”项
 */
export function extractHandleData(orderList: OrderItem[], orderInfo: GenericMap = {}, HANDLE_MAPPING: GenericMap = {}): HandleResultRow[] {
    const handleMap: Record<string, HandleResultRow> = {};

    const normalizeHandleKey = (value: unknown) => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[（【［]/g, '(')
        .replace(/[）】］]/g, ')')
        .replace(/\s+/g, '');

    const toText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const defaultSupplier = toText(HANDLE_MAPPING.defaultSupplier) || '拉手供应商';
    const unmatchedSupplier = toText(HANDLE_MAPPING.unmatchedSupplier) || '待人工处理';
    const manualReviewLabel = toText(HANDLE_MAPPING.manualReviewLabel) || '未匹配拉手(待人工处理)';

    const singleKeywords = Array.isArray(HANDLE_MAPPING.singleKeywords) && HANDLE_MAPPING.singleKeywords.length > 0
        ? HANDLE_MAPPING.singleKeywords.map((item: unknown) => toText(item)).filter(Boolean)
        : ['单活'];
    const doubleKeywords = Array.isArray(HANDLE_MAPPING.doubleKeywords) && HANDLE_MAPPING.doubleKeywords.length > 0
        ? HANDLE_MAPPING.doubleKeywords.map((item: unknown) => toText(item)).filter(Boolean)
        : ['双活'];
    const exportCustomerKeywords = Array.isArray(HANDLE_MAPPING.exportCustomerKeywords) && HANDLE_MAPPING.exportCustomerKeywords.length > 0
        ? HANDLE_MAPPING.exportCustomerKeywords.map((item: unknown) => toText(item)).filter(Boolean)
        : ['三部'];
    const defaultActivityForExport = toText(HANDLE_MAPPING.defaultActivityForExport) === 'single'
        ? 'single'
        : 'double';
    const placeholderKeywords = Array.isArray(HANDLE_MAPPING.placeholderKeywords) && HANDLE_MAPPING.placeholderKeywords.length > 0
        ? HANDLE_MAPPING.placeholderKeywords.map((item: unknown) => toText(item)).filter(Boolean)
        : ['冲整体拉手孔', '拉手孔', '开拉手孔', '开孔', '打孔'];
    const fallbackModelSources = Array.isArray(HANDLE_MAPPING.fallbackModelSources) && HANDLE_MAPPING.fallbackModelSources.length > 0
        ? HANDLE_MAPPING.fallbackModelSources.map((item: unknown) => toText(item)).filter((item) => item === 'remark' || item === 'xsbz')
        : ['remark', 'xsbz'];

    const thicknessAccessoryPacks = HANDLE_MAPPING.thicknessAccessoryPacks && typeof HANDLE_MAPPING.thicknessAccessoryPacks === 'object'
        ? HANDLE_MAPPING.thicknessAccessoryPacks
        : {
            '5': '5公分配件包',
            '7': '7公分配件包',
            '9': '9公分配件包',
            '10': '10公分配件包'
        };

    const normalizedMapping = new Map<string, { modelKey: string; entry: GenericMap }>();
    const mappings = HANDLE_MAPPING.mappings && typeof HANDLE_MAPPING.mappings === 'object'
        ? HANDLE_MAPPING.mappings
        : {};
    Object.entries(mappings).forEach(([rawKey, entry]) => {
        const normalized = normalizeHandleKey(rawKey);
        if (!normalized || !entry || typeof entry !== 'object') return;
        if (!normalizedMapping.has(normalized)) {
            normalizedMapping.set(normalized, { modelKey: rawKey, entry: entry as GenericMap });
        }
    });
    const normalizedCandidates = Array.from(normalizedMapping.entries())
        .map(([normalized, value]) => ({ normalized, modelKey: value.modelKey, entry: value.entry }))
        .sort((a, b) => b.normalized.length - a.normalized.length);

    const resolveExactMapping = (modelName: string) => {
        const direct = mappings[modelName];
        if (direct && typeof direct === 'object') {
            return { modelKey: modelName, entry: direct as GenericMap };
        }
        return normalizedMapping.get(normalizeHandleKey(modelName)) || null;
    };

    const matchModelFromText = (text: string) => {
        const normalizedText = normalizeHandleKey(text);
        if (!normalizedText) return '';
        const matched = normalizedCandidates.find((candidate) => normalizedText.includes(candidate.normalized));
        return matched ? matched.modelKey : '';
    };

    const isPlaceholderHandleText = (value: string) => {
        if (!value) return false;
        return placeholderKeywords.some((keyword: string) => keyword && value.includes(keyword));
    };

    const resolveFallbackModel = (item: GenericMap) => {
        const sourceHit: Partial<Record<'remark' | 'xsbz', string>> = {};
        const remarkCandidates = [toText(item.remark), toText(orderInfo.remark)].filter(Boolean);
        const xsbzCandidate = toText(item.xsbz);

        fallbackModelSources.forEach((source: string) => {
            if (source === 'remark') {
                const hit = remarkCandidates.map((text) => matchModelFromText(text)).find(Boolean) || '';
                if (hit) sourceHit.remark = hit;
                return;
            }
            if (source === 'xsbz') {
                const hit = matchModelFromText(xsbzCandidate);
                if (hit) sourceHit.xsbz = hit;
            }
        });

        const pickedValues = Array.from(new Set(Object.values(sourceHit).filter(Boolean)));
        if (pickedValues.length > 1) {
            return {
                modelKey: '',
                mapping: null,
                source: 'conflict',
                conflict: sourceHit
            };
        }
        if (!pickedValues.length) {
            return {
                modelKey: '',
                mapping: null,
                source: 'none'
            };
        }

        const modelKey = pickedValues[0];
        const resolved = resolveExactMapping(modelKey);
        return {
            modelKey,
            mapping: resolved ? resolved.entry : null,
            source: sourceHit.remark ? 'remark' : 'xsbz'
        };
    };

    const resolveHandleModel = (item: GenericMap) => {
        const rawLs = toText(item.ls);
        const lsIsPlaceholder = isPlaceholderHandleText(rawLs);

        if (!lsIsPlaceholder && rawLs) {
            const exact = resolveExactMapping(rawLs);
            if (exact) {
                return {
                    modelKey: exact.modelKey,
                    mapping: exact.entry,
                    source: 'ls'
                };
            }
        }

        const fallback = resolveFallbackModel(item);
        return {
            ...fallback,
            source: fallback.source,
            lsIsPlaceholder
        };
    };

    const detectActivity = (item: GenericMap): 'single' | 'double' | null => {
        const texts = [
            toText(item.xsbz),
            toText(item.ls),
            toText(item.remark),
            toText(orderInfo.remark)
        ].filter(Boolean);

        const hasDouble = texts.some((text) => doubleKeywords.some((keyword: string) => keyword && text.includes(keyword)));
        const hasSingle = texts.some((text) => singleKeywords.some((keyword: string) => keyword && text.includes(keyword)));

        if (hasDouble) return 'double';
        if (hasSingle) return 'single';
        return null;
    };
    const isExportCustomer = (customerName: unknown) => {
        const name = toText(customerName);
        if (!name) return false;
        return exportCustomerKeywords.some((keyword: string) => keyword && name.includes(keyword));
    };
    const activityLabel = (activity: 'single' | 'double') => activity === 'double' ? '双活' : '单活';
    const EXPORT_REMARK = '外贸白包';

    const append = (row: HandleResultRow) => {
        const key = `${row.supplier}|${row.type}|${row.spec}|${row.remark}`;
        if (handleMap[key]) {
            handleMap[key].quantityLeft += row.quantityLeft;
            handleMap[key].quantityRight += row.quantityRight;
            handleMap[key].quantity += row.quantity;
            return;
        }
        handleMap[key] = row;
    };

    orderList.forEach((item) => {
        const handleName = toText(item.ls);
        if (!handleName || handleName === '-' || handleName === '无') return;

        const qtyPair = parseQuantityPair(item.qty);
        const totalQty = qtyPair.left + qtyPair.right;
        if (totalQty <= 0) return;

        const thickness = toText(item.mshd);
        const exportCustomer = isExportCustomer(orderInfo.customerName);
        let activity = detectActivity(item);
        if (!activity && exportCustomer) {
            activity = defaultActivityForExport;
        }
        const accessoryPack = toText(thicknessAccessoryPacks[thickness]);

        const resolvedModel = resolveHandleModel(item);
        const mapping = resolvedModel.mapping;
        if (!mapping || !activity || !accessoryPack) {
            const conflict = (resolvedModel as { conflict?: Partial<Record<'remark' | 'xsbz', string>> }).conflict;
            const fallbackSourceLabel = resolvedModel.source === 'remark' || resolvedModel.source === 'xsbz'
                ? resolvedModel.source
                : 'ls';
            const conflictReason = resolvedModel.source === 'conflict'
                ? `型号冲突(remark=${conflict?.remark || '-'},xsbz=${conflict?.xsbz || '-'})`
                : '';
            const missingModelLabel = resolvedModel.modelKey || handleName;
            const pendingReason = [
                !mapping ? (conflictReason || `型号未匹配(${missingModelLabel};来源:${fallbackSourceLabel})`) : '',
                !activity ? '未识别单活/双活' : '',
                !accessoryPack ? `门厚异常(${thickness || '空值'})` : ''
            ].filter(Boolean).join('，');

            append({
                supplier: unmatchedSupplier,
                type: manualReviewLabel,
                spec: accessoryPack || '-',
                remark: `待人工处理：${pendingReason || '规则缺失'}${exportCustomer ? `，${EXPORT_REMARK}` : ''}`,
                quantityLeft: qtyPair.left,
                quantityRight: qtyPair.right,
                quantity: totalQty
            });
            return;
        }

        const supplier = toText(mapping.supplier) || defaultSupplier;
        const vendorName = toText(mapping.vendorName);
        const effectiveModelLabel = resolvedModel.modelKey || handleName;

        if (!vendorName) {
            append({
                supplier: unmatchedSupplier,
                type: manualReviewLabel,
                spec: accessoryPack,
                remark: `待人工处理：供应商名称缺失(${effectiveModelLabel}/${activity === 'double' ? '双活' : '单活'})${exportCustomer ? `，${EXPORT_REMARK}` : ''}`,
                quantityLeft: qtyPair.left,
                quantityRight: qtyPair.right,
                quantity: totalQty
            });
            return;
        }

        const label = activityLabel(activity);
        const finalType = vendorName.includes(label) ? vendorName : `${vendorName} - ${label}`;

        append({
            supplier,
            type: finalType,
            spec: accessoryPack,
            remark: exportCustomer ? EXPORT_REMARK : '',
            quantityLeft: qtyPair.left,
            quantityRight: qtyPair.right,
            quantity: totalQty
        });
    });

    return Object.values(handleMap);
}
