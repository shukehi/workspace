/**
 * 数据提取工具集
 * 负责从原始订单行提取各类采购数据
 */



import { parseHeight, parseQuantityPair } from './parsers';
import { aggregatePackaging } from './packagingTable';
export {
    extractCylinderAccessoryPackData,
    extractCylinderData,
} from './extractors/cylinderExtractor';
export { extractLockData } from './extractors/lockExtractor';
import { deriveLockForkRows } from '@/services/lockForkDeriver';
import type { LockForkDimensionGroup } from '@/types/mapping';
import {
    adaptCylinderAccessoryPackRulesToRuleSet,
    adaptCylinderMapping,
    adaptLockForkMapping,
    adaptLockForkFlatBottomRulesToRuleSet,
    adaptLockForkHangingFeetRulesToRuleSet,
    adaptLockForkEdgeTypeRulesToRuleSet,
    adaptLockForkTypeRulesToRuleSet,
    collectRuleExecution,
    executeRuleSet,
    normalizeLockMappingKey,
    resolveLockForkDimensionRuleWithRules,
} from '@/services/mappings';

type OrderItem = Record<string, any>;
type GenericMap = Record<string, any>;
type LockForkResultRow = {
    supplier: string;
    type: string;
    spec: string;
    remark: string;
    quantity: number;
    matchedRules: string[];
    winningRules: string[];
};
type HandleResultRow = {
    supplier: string;
    materialId?: string;
    type: string;
    spec: string;
    remark: string;
    quantityLeft: number;
    quantityRight: number;
    quantity: number;
};

function applyP66BaseDimensionOverride(
    dimensions: LockForkDimensionGroup | null,
    mainLockName: unknown,
    thickness: string,
    source: 'base' | 'high_height' | 'fallback_7' | undefined,
    selectedVariant: 'standard' | 'withHangingFeet' | undefined,
    lockTypeConfig: GenericMap | null,
): LockForkDimensionGroup | null {
    if (!dimensions) return null;
    if (lockTypeConfig?.nameModifier !== 'P66') return dimensions;
    if (normalizeLockMappingKey(String(mainLockName || '')) !== normalizeLockMappingKey('SD-9030（6607大锁）')) return dimensions;
    if (thickness !== '5' && thickness !== '7') return dimensions;

    const overridden = {
        upper: { ...dimensions.upper },
        lower: { ...dimensions.lower },
    };

    overridden.upper.base1 = 497;
    overridden.lower.base1 = 497;

    if (selectedVariant === 'standard') {
        const base2 = source === 'high_height' ? 376 : 301;
        overridden.upper.base2 = base2;
        overridden.lower.base2 = base2;
    }

    return overridden;
}

function resolveLockForkHeightAdjustments(
    thickness: string,
    source: 'base' | 'high_height' | 'fallback_7' | undefined,
    doorHeight: number,
    heightReference: number,
): { upper: number; lower: number } {
    if ((thickness === '5' || thickness === '7') && source === 'high_height') {
        return {
            upper: doorHeight - heightReference,
            lower: 0,
        };
    }

    const sharedAdjustment = Math.round((doorHeight - heightReference) / 2);
    return {
        upper: sharedAdjustment,
        lower: sharedAdjustment,
    };
}

function mergeRuleNames(current: string[], incoming: string[]): string[] {
    const merged = new Set<string>(current);
    incoming.forEach((item) => {
        const normalized = String(item || '').trim();
        if (normalized) merged.add(normalized);
    });
    return Array.from(merged);
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
    const adaptedLockForkMapping = adaptLockForkMapping(LOCK_FORK_MAPPING);
    const lockForkTypeRuleSet = adaptLockForkTypeRulesToRuleSet(adaptedLockForkMapping);
    const lockForkEdgeTypeRuleSet = adaptLockForkEdgeTypeRulesToRuleSet(adaptedLockForkMapping);
    const lockForkHangingFeetRuleSet = adaptLockForkHangingFeetRulesToRuleSet(adaptedLockForkMapping);
    const lockForkFlatBottomRuleSet = adaptLockForkFlatBottomRulesToRuleSet();

    const parseOpenDirection = (spec: unknown): '内开' | '外开' | '' => {
        if (!spec || typeof spec !== 'string') return '';
        const parts = spec.split('/');
        if (parts.length < 3) return '';
        const directionPart = parts[2];
        if (directionPart.includes('内开')) return '内开';
        if (directionPart.includes('外开')) return '外开';
        return '';
    };

    const shouldSkipTEdgeModifier = (item: OrderItem, edgeModifier: string | null): boolean => {
        if (edgeModifier !== 'T型') return false;
        if (String((item as any)?.mshd || '').trim() !== '10') return false;
        if (parseOpenDirection(item.spec) !== '内开') return false;

        const mb = String(item.mb || '').trim();
        return mb.includes('T型铝材边');
    };

    // 助手：检测吊脚
    const detectHangingFeet = (xsbz: unknown): { value: number | null; matchedRules: string[]; winningRules: string[] } => {
        if (!xsbz || typeof xsbz !== 'string') {
            return { value: null, matchedRules: [], winningRules: [] };
        }

        const execution = executeRuleSet(lockForkHangingFeetRuleSet, {
            xsbz: xsbz.trim(),
        });
        if (execution.winningRules.length === 0) {
            return {
                value: null,
                matchedRules: execution.matchedRules,
                winningRules: execution.winningRules,
            };
        }

        const keyword = String(execution.output.extra?.keyword || '').trim();
        if (!keyword) {
            return {
                value: 0,
                matchedRules: execution.matchedRules,
                winningRules: execution.winningRules,
            };
        }

        const match = xsbz.match(new RegExp(`${keyword}\\s*(\\d+)`, 'i'));
        return {
            value: match ? parseInt(match[1], 10) : 0,
            matchedRules: execution.matchedRules,
            winningRules: execution.winningRules,
        };
    };

    // 助手：检测平下档
    const detectFlatBottomRail = (xsbz: unknown): { value: string | null; matchedRules: string[]; winningRules: string[] } => {
        if (!xsbz || typeof xsbz !== 'string') {
            return { value: null, matchedRules: [], winningRules: [] };
        }

        const execution = executeRuleSet(lockForkFlatBottomRuleSet, {
            xsbz: xsbz.trim(),
        });
        if (execution.winningRules.length === 0) {
            return {
                value: null,
                matchedRules: execution.matchedRules,
                winningRules: execution.winningRules,
            };
        }

        const match = xsbz.match(/(\d+(?:\.\d+)?CM平下档)/i);
        return {
            value: match ? match[1] : '平下档',
            matchedRules: execution.matchedRules,
            winningRules: execution.winningRules,
        };
    };

    // 助手：检测边型
    const detectEdgeType = (mb: unknown): { nameModifier: string | null; matchedRules: string[]; winningRules: string[] } => {
        const execution = executeRuleSet(lockForkEdgeTypeRuleSet, {
            mb: typeof mb === 'string' ? mb.trim() : '',
        });

        return {
            nameModifier: String(execution.output.extra?.nameModifier || '').trim() || null,
            matchedRules: execution.matchedRules,
            winningRules: execution.winningRules,
        };
    };

    // 助手：检测锁具类型
    const detectLockType = (sj: unknown, fssj: unknown): { config: GenericMap | null; matchedRules: string[]; winningRules: string[] } => {
        const execution = executeRuleSet(lockForkTypeRuleSet, {
            sj: typeof sj === 'string' ? sj.trim() : '',
            fssj: typeof fssj === 'string' ? fssj.trim() : '',
        });
        if (execution.winningRules.length === 0) {
            return {
                config: null,
                matchedRules: execution.matchedRules,
                winningRules: execution.winningRules,
            };
        }

        return {
            config: {
                ...(execution.output.extra || {}),
            },
            matchedRules: execution.matchedRules,
            winningRules: execution.winningRules,
        };
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

        // 3. 检测平下档和吊脚（互斥）
        const flatBottomRailResult = detectFlatBottomRail(item.xsbz);
        const flatBottomRail = flatBottomRailResult.value;
        const hasFlatBottomRail = flatBottomRail !== null;

        const hangingFeetResult = hasFlatBottomRail
            ? { value: null, matchedRules: [] as string[], winningRules: [] as string[] }
            : detectHangingFeet(item.xsbz);
        const hangingFeetValue = hangingFeetResult.value;
        const hasHangingFeet = hangingFeetValue !== null;
        const hangingFeetAdjustment = hasHangingFeet
            ? (adaptedLockForkMapping.hangingFeet?.standard || 35) - hangingFeetValue
            : 0;

        // 4. 获取基础尺寸
        const {
            dimensions,
            heightReference,
            matchedRules: dimensionMatchedRules,
            winningRules: dimensionWinningRules,
            selectedVariant,
            source,
        } = resolveLockForkDimensionRuleWithRules(
            adaptedLockForkMapping,
            {
                thickness,
                doorHeight,
                useHangingFeetDimensions: hasFlatBottomRail || hasHangingFeet,
            },
        );
        const heightAdjustments = resolveLockForkHeightAdjustments(
            thickness,
            source,
            doorHeight,
            heightReference,
        );

        if (!dimensions) {
            console.warn(`⚠️ 未找到门厚 ${thickness}cm 的锁叉基础尺寸配置`);
            return;
        }

        if (!dimensions) {
            console.warn(`⚠️ 未找到门厚 ${thickness}cm 对应的锁叉尺寸配置`);
            return;
        }

        // 5. 检测边型和锁具类型
        const edgeTypeResult = detectEdgeType(item.mb);
        const rawEdgeModifier = edgeTypeResult.nameModifier;
        const edgeModifier = shouldSkipTEdgeModifier(item, rawEdgeModifier)
            ? null
            : rawEdgeModifier;
        const lockTypeResult = detectLockType(item.sj, item.fssj);
        const lockTypeConfig = lockTypeResult.config;
        const resolvedDimensions = applyP66BaseDimensionOverride(
            dimensions,
            item.sj,
            thickness,
            source,
            selectedVariant,
            lockTypeConfig,
        );
        if (!resolvedDimensions) {
            console.warn(`⚠️ 未找到门厚 ${thickness}cm 对应的锁叉尺寸配置`);
            return;
        }
        const matchedRules = mergeRuleNames(
            mergeRuleNames(
                mergeRuleNames(lockTypeResult.matchedRules, edgeTypeResult.matchedRules),
                mergeRuleNames(flatBottomRailResult.matchedRules, hangingFeetResult.matchedRules),
            ),
            dimensionMatchedRules,
        );
        const winningRules = mergeRuleNames(
            mergeRuleNames(
                mergeRuleNames(lockTypeResult.winningRules, edgeTypeResult.winningRules),
                mergeRuleNames(flatBottomRailResult.winningRules, hangingFeetResult.winningRules),
            ),
            dimensionWinningRules,
        );


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

        // 8. 构建锁叉名称（基础部分）
        let baseName = item.sc; // 如 "单头锁叉"

        // 添加边型修饰符（如果有）
        if (edgeModifier) {
            baseName = `${baseName} ${edgeModifier}`; // "单头锁叉 T型"
        }

        const qtyPair = parseQuantityPair(item.qty);
        const totalQty = qtyPair.left + qtyPair.right;
        const derived = deriveLockForkRows({
            baseName,
            dimensions: resolvedDimensions,
            thickness,
            doorHeight,
            upperHeightAdjustment: heightAdjustments.upper,
            lowerHeightAdjustment: heightAdjustments.lower,
            hangingFeetAdjustment,
            flatBottomRail,
            hangingFeetValue,
            lockTypeConfig,
        });
        const [upperRow, lowerRow] = derived.rows;
        const remarkText = derived.remark;

        // 11. 生成上头和下头两条记录
        const upperKey = `${upperRow.type}|${upperRow.spec}|${remarkText}`;
        const lowerKey = `${lowerRow.type}|${lowerRow.spec}|${remarkText}`;

        if (lockForkMap[upperKey]) {
            lockForkMap[upperKey].quantity += totalQty;
            lockForkMap[upperKey].matchedRules = mergeRuleNames(lockForkMap[upperKey].matchedRules, matchedRules);
            lockForkMap[upperKey].winningRules = mergeRuleNames(lockForkMap[upperKey].winningRules, winningRules);
        } else {
            lockForkMap[upperKey] = {
                supplier: adaptedLockForkMapping.suppliers?.default || '锁叉供应商',
                type: upperRow.type,
                spec: upperRow.spec,
                remark: upperRow.remark,
                quantity: totalQty,
                matchedRules: [...matchedRules],
                winningRules: [...winningRules],
            };
        }

        if (lockForkMap[lowerKey]) {
            lockForkMap[lowerKey].quantity += totalQty;
            lockForkMap[lowerKey].matchedRules = mergeRuleNames(lockForkMap[lowerKey].matchedRules, matchedRules);
            lockForkMap[lowerKey].winningRules = mergeRuleNames(lockForkMap[lowerKey].winningRules, winningRules);
        } else {
            lockForkMap[lowerKey] = {
                supplier: adaptedLockForkMapping.suppliers?.default || '锁叉供应商',
                type: lowerRow.type,
                spec: lowerRow.spec,
                remark: lowerRow.remark,
                quantity: totalQty,
                matchedRules: [...matchedRules],
                winningRules: [...winningRules],
            };
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
        const key = `${row.supplier}|${row.materialId || ''}|${row.type}|${row.spec}|${row.remark}`;
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
        const materialId = toText(mapping.materialCode);
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
            materialId,
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
