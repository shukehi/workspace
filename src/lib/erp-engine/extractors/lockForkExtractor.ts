import { parseHeight, parseQuantityPair } from '../parsers';
import { deriveLockForkRows } from '@/services/lockForkDeriver';
import type { LockForkDimensionGroup } from '@/types/mapping';
import type { RuleDetectionResult, RuleTrace, SourceOrderInfo, SourceOrderItemBase } from '../extractorTypes';
import {
    adaptLockForkMapping,
    adaptLockForkFlatBottomRulesToRuleSet,
    adaptLockForkHangingFeetRulesToRuleSet,
    adaptLockForkEdgeTypeRulesToRuleSet,
    adaptLockForkTypeRulesToRuleSet,
    DEFAULT_LOCK_FORK_HANGING_FEET,
    executeRuleSet,
    normalizeLockMappingKey,
    resolveLockForkDimensionRuleWithRules,
} from '@/services/mappings';

type LockForkOrderItem = SourceOrderItemBase & {
    mb?: unknown;
    sj?: unknown;
    fssj?: unknown;
    sc?: unknown;
};

type LockForkOrderInfo = SourceOrderInfo;
type LockForkConfig = Record<string, unknown>;

type LockForkTypeConfig = {
    nameModifier?: string;
    [key: string]: unknown;
};

type LockForkResultRow = RuleTrace & {
    supplier: string;
    type: string;
    spec: string;
    remark: string;
    quantity: number;
};

function applyP66BaseDimensionOverride(
    dimensions: LockForkDimensionGroup | null,
    mainLockName: unknown,
    thickness: string,
    source: 'base' | 'high_height' | 'fallback_7' | undefined,
    selectedVariant: 'standard' | 'withHangingFeet' | undefined,
    lockTypeConfig: LockForkTypeConfig | null,
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
 * 提取锁叉采购数据
 * @param {Array} orderList - 原始订单列表
 * @param {Object} orderInfo - 订单汇总信息
 * @param {Object} LOCK_FORK_MAPPING - 注入的配置
 */
export function extractLockForkData(orderList: LockForkOrderItem[], orderInfo: LockForkOrderInfo = {}, LOCK_FORK_MAPPING: LockForkConfig = {}): LockForkResultRow[] {
    void orderInfo;
    const lockForkMap: Record<string, LockForkResultRow> = {};
    const adaptedLockForkMapping = adaptLockForkMapping(LOCK_FORK_MAPPING);
    const lockForkTypeRuleSet = adaptLockForkTypeRulesToRuleSet(adaptedLockForkMapping);
    const lockForkEdgeTypeRuleSet = adaptLockForkEdgeTypeRulesToRuleSet(adaptedLockForkMapping);
    const lockForkHangingFeetRuleSet = adaptLockForkHangingFeetRulesToRuleSet(adaptedLockForkMapping);
    const lockForkFlatBottomRuleSet = adaptLockForkFlatBottomRulesToRuleSet();

    const parseOpenDirection = (spec: string | null | undefined): '内开' | '外开' | '' => {
        if (!spec) return '';
        const parts = spec.split('/');
        if (parts.length < 3) return '';
        const directionPart = parts[2];
        if (directionPart.includes('内开')) return '内开';
        if (directionPart.includes('外开')) return '外开';
        return '';
    };

    const shouldSkipTEdgeModifier = (item: Pick<LockForkOrderItem, 'mshd' | 'spec' | 'mb'>, edgeModifier: string | null): boolean => {
        if (edgeModifier !== 'T型') return false;
        if (String(item.mshd || '').trim() !== '10') return false;
        if (parseOpenDirection(item.spec || undefined) !== '内开') return false;

        const mb = String(item.mb || '').trim();
        return mb.includes('T型铝材边');
    };

    const detectHangingFeet = (xsbz: unknown): RuleDetectionResult<number | null> => {
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

    const detectFlatBottomRail = (xsbz: unknown): RuleDetectionResult<string | null> => {
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

    const detectEdgeType = (mb: unknown): RuleDetectionResult<string | null> => {
        const execution = executeRuleSet(lockForkEdgeTypeRuleSet, {
            mb: typeof mb === 'string' ? mb.trim() : '',
        });

        return {
            value: String(execution.output.extra?.nameModifier || '').trim() || null,
            matchedRules: execution.matchedRules,
            winningRules: execution.winningRules,
        };
    };

    const detectLockType = (sj: unknown, fssj: unknown): { config: LockForkTypeConfig | null; matchedRules: string[]; winningRules: string[] } => {
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
        if (!item.sc || item.sc === '-' || item.sc === '无') return;

        const parts = String(item.spec || '').split('/');
        const specThickness = parts.length >= 2 ? parts[1].trim() : '';
        const rawThickness = String(item.mshd || '').trim();
        const thickness = specThickness || rawThickness || '7';

        const doorHeight = parseHeight(item.spec);

        const flatBottomRailResult = detectFlatBottomRail(item.xsbz);
        const flatBottomRail = flatBottomRailResult.value;
        const hasFlatBottomRail = flatBottomRail !== null;

        const hangingFeetResult = hasFlatBottomRail
            ? { value: null, matchedRules: [] as string[], winningRules: [] as string[] }
            : detectHangingFeet(item.xsbz);
        const hangingFeetValue = hangingFeetResult.value;
        const hasHangingFeet = hangingFeetValue !== null;
        const hangingFeetAdjustment = hasHangingFeet
            ? (adaptedLockForkMapping.hangingFeet?.standard || DEFAULT_LOCK_FORK_HANGING_FEET) - hangingFeetValue
            : 0;

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

        const edgeTypeResult = detectEdgeType(item.mb);
        const rawEdgeModifier = edgeTypeResult.value;
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

        let baseName = String(item.sc || '');
        if (edgeModifier) {
            baseName = `${baseName} ${edgeModifier}`;
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

        const upperKey = `${upperRow.type}|${upperRow.spec}|${derived.remark}`;
        const lowerKey = `${lowerRow.type}|${lowerRow.spec}|${derived.remark}`;

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

    return Object.values(lockForkMap);
}
