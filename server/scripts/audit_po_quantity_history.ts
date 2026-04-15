import fs from 'node:fs';
import path from 'node:path';
import { initDB, Order, OrderItem, sequelize } from '../models';
import contractCacheService from '../services/ContractCacheService';
import {
    diffAuditItems,
    normalizeAuditCategory,
    scoreAuditMismatch,
} from '../services/orders/order-quantity-audit';

type ScriptOptions = {
    json: boolean;
    outputPath: string;
    contractCodes: string[];
    orderNos: string[];
    limit: number;
    fetchMissingLive: boolean;
    cacheFetchedContracts: boolean;
    includeCancelled: boolean;
};

type PlainOrder = Record<string, any> & {
    order_no: string;
    supplier?: string | null;
    source_contract_code?: string | null;
    category?: string | null;
    status?: string | null;
    metadata?: Record<string, unknown>;
    items?: Record<string, unknown>[];
};

type ExpectedOrder = {
    category?: string;
    supplier?: string;
    items: Record<string, unknown>[];
};

function normalizeText(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function readOptions(argv: string[]): ScriptOptions {
    const options: ScriptOptions = {
        json: false,
        outputPath: '',
        contractCodes: [],
        orderNos: [],
        limit: 0,
        fetchMissingLive: false,
        cacheFetchedContracts: false,
        includeCancelled: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--json') {
            options.json = true;
            continue;
        }
        if (token === '--fetch-missing-live') {
            options.fetchMissingLive = true;
            continue;
        }
        if (token === '--cache-fetched-contracts') {
            options.cacheFetchedContracts = true;
            continue;
        }
        if (token === '--include-cancelled') {
            options.includeCancelled = true;
            continue;
        }
        if (token === '--output' && argv[index + 1]) {
            options.outputPath = path.resolve(argv[index + 1]);
            index += 1;
            continue;
        }
        if (token.startsWith('--output=')) {
            options.outputPath = path.resolve(token.slice('--output='.length));
            continue;
        }
        if (token === '--contract' && argv[index + 1]) {
            options.contractCodes.push(normalizeText(argv[index + 1]));
            index += 1;
            continue;
        }
        if (token.startsWith('--contract=')) {
            options.contractCodes.push(normalizeText(token.slice('--contract='.length)));
            continue;
        }
        if (token === '--order' && argv[index + 1]) {
            options.orderNos.push(normalizeText(argv[index + 1]));
            index += 1;
            continue;
        }
        if (token.startsWith('--order=')) {
            options.orderNos.push(normalizeText(token.slice('--order='.length)));
            continue;
        }
        if (token === '--limit' && argv[index + 1]) {
            options.limit = Number(argv[index + 1]) || 0;
            index += 1;
            continue;
        }
        if (token.startsWith('--limit=')) {
            options.limit = Number(token.slice('--limit='.length)) || 0;
        }
    }

    options.contractCodes = Array.from(new Set(options.contractCodes.filter(Boolean)));
    options.orderNos = Array.from(new Set(options.orderNos.filter(Boolean)));
    return options;
}

function orderGroupKey(orderLike: { category?: unknown; supplier?: unknown }) {
    return `${normalizeText(orderLike.category)}__${normalizeText(orderLike.supplier)}`;
}

function toPlainOrder(order: any): PlainOrder {
    return typeof order?.get === 'function'
        ? order.get({ plain: true })
        : { ...order };
}

function toExpectedMap(orders: ExpectedOrder[]) {
    return new Map<string, ExpectedOrder>(
        orders.map((order) => [orderGroupKey(order), order]),
    );
}

async function loadCurrentSourceAnalysisConfig() {
    const MappingService = await import('../services/mappings');
    const FormulaService = await import('../services/formulas/formula.workflow');
    const MaterialCatalogService = await import('../services/materials/materialCatalog.workflow');
    const { DataNormalizer } = await import('../../src/lib/erp-engine/dataNormalizer');

    const [
        formulas,
        materialsCatalog,
        packagingMapping,
        cylinderMapping,
        lockMapping,
        lockForkMapping,
        handleMapping,
    ] = await Promise.all([
        FormulaService.getPublishedFormulasMap(),
        MaterialCatalogService.getPublishedMaterialsCatalog(),
        MappingService.getPublishedMapping('packaging'),
        MappingService.getPublishedMapping('cylinder'),
        MappingService.getPublishedMapping('lock'),
        MappingService.getPublishedMapping('lock_fork'),
        MappingService.getPublishedMapping('handle'),
    ]);

    return {
        formulas,
        materials: DataNormalizer.normalizeMaterialCatalog(materialsCatalog as Record<string, unknown>),
        packagingMapping: packagingMapping || {},
        cylinderMapping: cylinderMapping || {},
        lockMapping: lockMapping || {},
        lockForkMapping: lockForkMapping || {},
        handleMapping: handleMapping || {},
    };
}

function normalizeErpContractResponse(res: any) {
    if (res?.rows && Array.isArray(res.rows) && res.rows.length > 0) {
        return res.rows[0];
    }
    if (Array.isArray(res) && res.length > 0) {
        return res[0];
    }
    return res;
}

async function loadContractByCode(code: string, options: ScriptOptions) {
    const cached = await contractCacheService.getByCode(code);
    const cachedPlain = cached && typeof cached.get === 'function'
        ? cached.get({ plain: true })
        : cached;
    if (cachedPlain?.raw_json) {
        return cachedPlain.raw_json;
    }

    if (!options.fetchMissingLive) return null;

    const erpService = (await import('../services/erpService')).default;
    const live = normalizeErpContractResponse(await erpService.getOrderDetail({ code }));
    if (!live) return null;
    if (options.cacheFetchedContracts) {
        await contractCacheService.cacheContract(live);
    }
    return live;
}

async function buildExpectedOrders(contract: Record<string, any>, config: Record<string, unknown>) {
    const { analyzeSourceOrder } = await import('../../src/services/sourceAnalysis');
    const { POGenerator } = await import('../../src/services/poGenerator');
    const { packagingMatcher } = await import('../../src/lib/packagingMatcher');

    const analysis = analyzeSourceOrder({
        order: contract,
        config,
        items: contract.list,
    });

    const sourceStore = {
        currentOrder: contract,
        materialRequirements: analysis.materialRequirements,
        hardwareRequirements: analysis.hardwareRequirements,
    };

    const generator = new POGenerator({
        sourceStore,
        packagingMatcher,
        packagingConfig: {
            getPackagingMapping() {
                return config.packagingMapping;
            },
        },
    });

    const buildOrders = (mergeSameSpec: boolean) => {
        const groups = generator.generateProposal({ mergeSameSpec });
        const selectedGroups = groups.map((group: any) => ({
            supplier: group.supplierName,
            category: group.category,
        }));
        return generator.createOrders(selectedGroups, { mergeSameSpec }) as ExpectedOrder[];
    };

    return {
        mergeTrue: buildOrders(true),
        mergeFalse: buildOrders(false),
    };
}

function selectBestExpectedOrder(actual: PlainOrder, expectedMaps: { mergeTrue: Map<string, ExpectedOrder>; mergeFalse: Map<string, ExpectedOrder> }) {
    const key = orderGroupKey(actual);
    const candidateTrue = expectedMaps.mergeTrue.get(key) || null;
    const candidateFalse = expectedMaps.mergeFalse.get(key) || null;
    if (!candidateTrue && !candidateFalse) {
        return { expected: null, selectedMergeMode: 'none' as const, lines: [] as ReturnType<typeof diffAuditItems>, score: 0 };
    }
    if (normalizeAuditCategory(actual.category) !== 'packaging') {
        const expected = candidateFalse || candidateTrue;
        const lines = diffAuditItems(actual.category, actual.items || [], expected?.items || []);
        return { expected, selectedMergeMode: candidateFalse ? 'merge-false' as const : 'merge-true' as const, lines, score: scoreAuditMismatch(lines) };
    }

    const diffTrue = candidateTrue ? diffAuditItems(actual.category, actual.items || [], candidateTrue.items || []) : null;
    const diffFalse = candidateFalse ? diffAuditItems(actual.category, actual.items || [], candidateFalse.items || []) : null;
    const scoreTrue = diffTrue ? scoreAuditMismatch(diffTrue) : Number.POSITIVE_INFINITY;
    const scoreFalse = diffFalse ? scoreAuditMismatch(diffFalse) : Number.POSITIVE_INFINITY;

    if (scoreFalse <= scoreTrue) {
        return {
            expected: candidateFalse,
            selectedMergeMode: 'merge-false' as const,
            lines: diffFalse || [],
            score: Number.isFinite(scoreFalse) ? scoreFalse : 0,
        };
    }

    return {
        expected: candidateTrue,
        selectedMergeMode: 'merge-true' as const,
        lines: diffTrue || [],
        score: Number.isFinite(scoreTrue) ? scoreTrue : 0,
    };
}

async function auditPoQuantityHistory() {
    const options = readOptions(process.argv.slice(2));

    try {
        await initDB();

        const config = await loadCurrentSourceAnalysisConfig();
        const orders = (await Order.findAll({
            include: [{ model: OrderItem, as: 'items' }],
            order: [['created_at', 'DESC'], ['id', 'DESC']],
        })).map(toPlainOrder);

        const filteredOrders = orders.filter((order) => {
            const sourceContractCode = normalizeText(order.source_contract_code || order.metadata?.source_contract_code);
            if (!sourceContractCode) return false;
            if (!options.includeCancelled && normalizeText(order.status) === 'cancelled') return false;
            if (normalizeText(order.metadata?.order_source) === 'manual') return false;
            if (options.contractCodes.length > 0 && !options.contractCodes.includes(sourceContractCode)) return false;
            if (options.orderNos.length > 0 && !options.orderNos.includes(normalizeText(order.order_no))) return false;
            return true;
        });

        const scopedOrders = options.limit > 0 ? filteredOrders.slice(0, options.limit) : filteredOrders;
        const orderGroups = new Map<string, PlainOrder[]>();
        for (const order of scopedOrders) {
            const contractCode = normalizeText(order.source_contract_code || order.metadata?.source_contract_code);
            if (!orderGroups.has(contractCode)) orderGroups.set(contractCode, []);
            orderGroups.get(contractCode)!.push(order);
        }

        const missingContracts: string[] = [];
        const mismatches: Record<string, unknown>[] = [];
        let scannedGroupCount = 0;

        for (const [contractCode, contractOrders] of orderGroups.entries()) {
            const contract = await loadContractByCode(contractCode, options);
            if (!contract || !Array.isArray(contract.list)) {
                missingContracts.push(contractCode);
                continue;
            }

            const expectedOrders = await buildExpectedOrders(contract, config);
            const expectedMaps = {
                mergeTrue: toExpectedMap(expectedOrders.mergeTrue),
                mergeFalse: toExpectedMap(expectedOrders.mergeFalse),
            };

            const actualGroups = new Map<string, { key: string; orders: PlainOrder[]; actual: PlainOrder }>();
            for (const order of contractOrders) {
                const key = orderGroupKey(order);
                if (!actualGroups.has(key)) {
                    actualGroups.set(key, {
                        key,
                        orders: [],
                        actual: {
                            order_no: order.order_no,
                            supplier: order.supplier,
                            category: order.category,
                            status: order.status,
                            source_contract_code: order.source_contract_code,
                            metadata: order.metadata,
                            items: [],
                        },
                    });
                }
                const target = actualGroups.get(key)!;
                target.orders.push(order);
                target.actual.items = [...(target.actual.items || []), ...(order.items || [])];
            }

            for (const group of actualGroups.values()) {
                scannedGroupCount += 1;
                const selection = selectBestExpectedOrder(group.actual, expectedMaps);
                if (!selection.expected) {
                    mismatches.push({
                        contractCode,
                        orderNos: group.orders.map((item) => item.order_no),
                        category: normalizeText(group.actual.category),
                        supplier: normalizeText(group.actual.supplier),
                        reason: 'missing_expected_group',
                        mismatchScore: null,
                        selectedMergeMode: selection.selectedMergeMode,
                        lines: [],
                    });
                    continue;
                }
                if (selection.lines.length === 0) continue;

                mismatches.push({
                    contractCode,
                    orderNos: group.orders.map((item) => item.order_no),
                    category: normalizeText(group.actual.category),
                    supplier: normalizeText(group.actual.supplier),
                    reason: 'quantity_mismatch',
                    mismatchScore: selection.score,
                    selectedMergeMode: selection.selectedMergeMode,
                    lines: selection.lines,
                });
            }
        }

        const sortedMismatches = mismatches.sort((a, b) => {
            const scoreA = Number((a.mismatchScore as number | null) ?? -1);
            const scoreB = Number((b.mismatchScore as number | null) ?? -1);
            return scoreB - scoreA;
        });

        const payload = {
            generatedAt: new Date().toISOString(),
            scannedOrders: scopedOrders.length,
            scannedContracts: orderGroups.size,
            scannedGroups: scannedGroupCount,
            mismatchedGroups: sortedMismatches.length,
            missingContracts,
            options,
            rows: sortedMismatches,
        };

        if (options.outputPath) {
            fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
            fs.writeFileSync(options.outputPath, JSON.stringify(payload, null, 2), 'utf8');
        }

        if (options.json) {
            console.log(JSON.stringify(payload, null, 2));
        } else {
            console.log('[audit_po_quantity_history] summary', {
                scannedOrders: payload.scannedOrders,
                scannedContracts: payload.scannedContracts,
                scannedGroups: payload.scannedGroups,
                mismatchedGroups: payload.mismatchedGroups,
                missingContracts: payload.missingContracts.length,
                outputPath: options.outputPath || null,
            });

            for (const code of missingContracts) {
                console.log('[audit_po_quantity_history] missing-contract', { contractCode: code });
            }

            for (const row of sortedMismatches.slice(0, 50)) {
                console.log('[audit_po_quantity_history] mismatch', {
                    contractCode: row.contractCode,
                    orderNos: row.orderNos,
                    category: row.category,
                    supplier: row.supplier,
                    reason: row.reason,
                    mismatchScore: row.mismatchScore,
                    selectedMergeMode: row.selectedMergeMode,
                });

                const lines = Array.isArray(row.lines) ? row.lines.slice(0, 10) : [];
                for (const line of lines) {
                    console.log('  [line]', line);
                }
            }
        }
    } catch (error) {
        console.error('[audit_po_quantity_history] failed', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

void auditPoQuantityHistory();
