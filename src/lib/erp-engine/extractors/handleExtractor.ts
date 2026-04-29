import { adaptHandleMapping } from '@/services/mappings';
import { parseQuantityPair } from '../parsers';
import type { SourceOrderInfo, SourceOrderItemBase } from '../extractorTypes';

type HandleOrderItem = SourceOrderItemBase & {
    ls?: unknown;
};

type HandleOrderInfo = SourceOrderInfo;

type HandleMappingEntry = {
    supplier?: unknown;
    vendorName?: unknown;
    materialCode?: unknown;
};

type HandleMappingConfig = Record<string, unknown> & {
    defaultSupplier?: unknown;
    unmatchedSupplier?: unknown;
    manualReviewLabel?: unknown;
    singleKeywords?: unknown[];
    doubleKeywords?: unknown[];
    exportCustomerKeywords?: unknown[];
    defaultActivityForExport?: unknown;
    placeholderKeywords?: unknown[];
    fallbackModelSources?: unknown[];
    thicknessAccessoryPacks?: Record<string, unknown>;
    mappings?: Record<string, HandleMappingEntry | undefined>;
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

type HandleModelResolution = {
    modelKey: string;
    mapping: HandleMappingEntry | null;
    source: 'ls' | 'remark' | 'xsbz' | 'none' | 'conflict';
    lsIsPlaceholder?: boolean;
    conflict?: Partial<Record<'remark' | 'xsbz', string>>;
};

/**
 * 提取拉手采购数据
 * 规则：
 * - 根据 xsbz/ls/remark 识别单活/双活（双活优先）
 * - 根据 mshd 识别 5/7/9/10 对应配件包
 * - 型号未匹配或门厚异常时，生成“待人工处理”项
 */
export function extractHandleData(orderList: HandleOrderItem[], orderInfo: HandleOrderInfo = {}, HANDLE_MAPPING: HandleMappingConfig = {}): HandleResultRow[] {
    const handleMap: Record<string, HandleResultRow> = {};

    const normalizeHandleKey = (value: unknown) => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[（【［]/g, '(')
        .replace(/[）】］]/g, ')')
        .replace(/\s+/g, '');

    const toText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
    const adaptedHandleMapping = adaptHandleMapping(HANDLE_MAPPING);
    const defaultSupplier = adaptedHandleMapping.defaultSupplier;
    const unmatchedSupplier = adaptedHandleMapping.unmatchedSupplier;
    const manualReviewLabel = adaptedHandleMapping.manualReviewLabel;

    const singleKeywords = adaptedHandleMapping.singleKeywords;
    const doubleKeywords = adaptedHandleMapping.doubleKeywords;
    const exportCustomerKeywords = adaptedHandleMapping.exportCustomerKeywords;
    const defaultActivityForExport = adaptedHandleMapping.defaultActivityForExport;
    const placeholderKeywords = adaptedHandleMapping.placeholderKeywords;
    const fallbackModelSources = adaptedHandleMapping.fallbackModelSources;
    const thicknessAccessoryPacks = adaptedHandleMapping.thicknessAccessoryPacks;

    const normalizedMapping = new Map<string, { modelKey: string; entry: HandleMappingEntry }>();
    const mappings = adaptedHandleMapping.mappings;
    Object.entries(mappings).forEach(([rawKey, entry]) => {
        const normalized = normalizeHandleKey(rawKey);
        if (!normalized || !entry || typeof entry !== 'object') return;
        if (!normalizedMapping.has(normalized)) {
            normalizedMapping.set(normalized, { modelKey: rawKey, entry });
        }
    });
    const normalizedCandidates = Array.from(normalizedMapping.entries())
        .map(([normalized, value]) => ({ normalized, modelKey: value.modelKey, entry: value.entry }))
        .sort((a, b) => b.normalized.length - a.normalized.length);

    const resolveExactMapping = (modelName: string) => {
        const direct = mappings[modelName];
        if (direct && typeof direct === 'object') {
            return { modelKey: modelName, entry: direct };
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

    const resolveFallbackModel = (item: Pick<HandleOrderItem, 'remark' | 'xsbz'>): HandleModelResolution => {
        const sourceHit: Partial<Record<'remark' | 'xsbz', string>> = {};
        const remarkCandidates = [toText(item.remark), toText(orderInfo.remark)].filter(Boolean);
        const xsbzCandidate = toText(item.xsbz);

        fallbackModelSources.forEach((source) => {
            if (source === 'remark') {
                const hit = remarkCandidates.map((text) => matchModelFromText(text)).find(Boolean) || '';
                if (hit) sourceHit.remark = hit;
                return;
            }
            const hit = matchModelFromText(xsbzCandidate);
            if (hit) sourceHit.xsbz = hit;
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

    const resolveHandleModel = (item: Pick<HandleOrderItem, 'ls' | 'remark' | 'xsbz'>): HandleModelResolution => {
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

    const detectActivity = (item: Pick<HandleOrderItem, 'xsbz' | 'ls' | 'remark'>): 'single' | 'double' | null => {
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
            const conflict = resolvedModel.conflict;
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
