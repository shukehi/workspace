const FormulaRepository = require('./formula.repository');
const { Op } = require('sequelize');
const {
    filterMeaningfulBomRows,
    normalizeBom,
    parsePayload,
    serializePayload,
    validateBaseFields,
    validateBomRows
} = require('./formula.validator');
const {
    toDetail,
    toPublishedMap,
    toRevisionMeta,
    toSummary
} = require('./formula.mapper');

const VALID_STATES = new Set(['draft', 'published', 'archived']);

function operatorFromRequest(req) {
    const fromHeader = req?.headers?.['x-operator'] || req?.headers?.['x-user'];
    return String(fromHeader || 'system-admin');
}

function formatDateYYYYMMDD(input = new Date()) {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
        const fallback = new Date();
        return `${fallback.getFullYear()}${String(fallback.getMonth() + 1).padStart(2, '0')}${String(fallback.getDate()).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

async function generateNextFormulaKey(transaction, dateInput = new Date()) {
    const datePart = formatDateYYYYMMDD(dateInput);
    const prefix = `F${datePart}-`;
    const rows = await FormulaRepository.listDefinitionKeysByPrefix(prefix, transaction);
    let maxSequence = 0;
    const regex = new RegExp(`^F${datePart}-(\\d{4})$`);

    rows.forEach((row) => {
        const key = String(row?.formula_key || '').trim();
        const match = key.match(regex);
        if (!match) return;
        const value = Number(match[1]);
        if (!Number.isNaN(value)) {
            maxSequence = Math.max(maxSequence, value);
        }
    });

    return `F${datePart}-${String(maxSequence + 1).padStart(4, '0')}`;
}

function buildSupplierModelCode(supplier, modelOrCode) {
    const normalizedSupplier = String(supplier || '').trim();
    const normalizedModelOrCode = String(modelOrCode || '').trim();
    if (!normalizedSupplier || !normalizedModelOrCode) return '';
    if (normalizedModelOrCode.startsWith(normalizedSupplier)) return normalizedModelOrCode;
    return `${normalizedSupplier}${normalizedModelOrCode}`;
}

function isFormulaKeyUniqueConflict(error) {
    if (!error) return false;
    if (error.name !== 'SequelizeUniqueConstraintError') return false;
    const fields = error.fields || {};
    if (fields.formula_key) return true;
    const msg = String(error.message || '');
    return msg.includes('formula_key') || msg.includes('formula_definitions.formula_key');
}

function isSqliteBusyError(error) {
    if (!error) return false;
    if (error.name === 'SequelizeTimeoutError') return true;
    const msg = String(error.message || error?.original?.message || '');
    const code = String(error.code || error?.original?.code || '');
    return msg.includes('SQLITE_BUSY') || code === 'SQLITE_BUSY';
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function validateAndResolveBomWithMaterials(bom) {
    const normalizedRows = normalizeBom(bom);
    const shapeErrors = validateBomRows({ bom: normalizedRows, allowEmptyBom: false, materialCodeSet: null });
    if (shapeErrors.length > 0) {
        return { bom: normalizedRows, errors: shapeErrors };
    }

    const candidateCodes = new Set();
    normalizedRows.forEach((row) => {
        if (row.materialId) candidateCodes.add(row.materialId);
        const supplierModelCode = buildSupplierModelCode(row.supplier, row.materialId);
        if (supplierModelCode) candidateCodes.add(supplierModelCode);
    });

    const found = await FormulaRepository.findMaterialsByCodes([...candidateCodes]);
    const materialCodeSet = new Set(found.map((item) => String(item.code || '').trim()).filter(Boolean));

    const resolvedBom = normalizedRows.map((row) => {
        if (materialCodeSet.has(row.materialId)) return row;

        const supplierModelCode = buildSupplierModelCode(row.supplier, row.materialId);
        if (supplierModelCode && materialCodeSet.has(supplierModelCode)) {
            return {
                ...row,
                materialId: supplierModelCode
            };
        }
        return row;
    });

    const missingErrors = [];
    const seenMissing = new Set();
    resolvedBom.forEach((row) => {
        if (!row.materialId || materialCodeSet.has(row.materialId)) return;
        const dedupeKey = `${row.supplier || ''}::${row.materialId}`;
        if (seenMissing.has(dedupeKey)) return;
        seenMissing.add(dedupeKey);
        missingErrors.push({
            field: 'bom',
            message: row.supplier
                ? `物料不存在: ${row.supplier}+${row.materialId}`
                : `物料不存在: ${row.materialId}`
        });
    });

    return { bom: resolvedBom, errors: missingErrors };
}

async function listFormulas({ keyword = '', status = '', page = 1, pageSize = 20 } = {}) {
    const where = {};
    if (status && VALID_STATES.has(status)) where.status = status;
    if (keyword) {
        where[Op.or] = [
            { formula_key: { [Op.like]: `%${keyword}%` } },
            { display_name: { [Op.like]: `%${keyword}%` } }
        ];
    }

    const limit = Math.max(1, Math.min(Number(pageSize) || 20, 200));
    const currentPage = Math.max(Number(page) || 1, 1);
    const offset = (currentPage - 1) * limit;

    const { rows, count } = await FormulaRepository.listDefinitions({
        where,
        limit,
        offset
    });

    return {
        items: rows.map(toSummary),
        total: count,
        page: currentPage,
        pageSize: limit
    };
}

async function getFormulaDetail(formulaKey) {
    const definition = await FormulaRepository.findDefinitionByKey(formulaKey);
    if (!definition) return null;

    const revisions = await FormulaRepository.listRevisionsByFormulaId(definition.id);
    const draftRevision = revisions[0] || null;
    const publishedRevision = revisions.find((item) => item.state === 'published') || null;
    const activeRevision = draftRevision || publishedRevision || revisions[0] || null;

    const payload = activeRevision
        ? parsePayload(activeRevision.payload_json)
        : { formulaKey: definition.formula_key, displayName: definition.display_name, bom: [] };

    return {
        formula: toDetail(definition, payload),
        draftRevision: draftRevision ? toRevisionMeta(draftRevision) : null,
        publishedRevision: publishedRevision ? toRevisionMeta(publishedRevision) : null
    };
}

async function createFormula({ formulaKey, displayName, bom, changeNote, operator }) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await FormulaRepository.withTransaction(async (transaction) => {
                const generatedFormulaKey = await generateNextFormulaKey(transaction);
                const targetFormulaKey = String(generatedFormulaKey || '').trim();
                const targetDisplayName = String(displayName || '').trim();

                const baseErrors = validateBaseFields({ formulaKey: targetFormulaKey, displayName: targetDisplayName });
                if (baseErrors.length > 0) {
                    return { ok: false, status: 422, errors: baseErrors };
                }

                let normalizedBom = filterMeaningfulBomRows(bom);
                if (normalizedBom.length > 0) {
                    const bomValidation = await validateAndResolveBomWithMaterials(normalizedBom);
                    if (bomValidation.errors.length > 0) {
                        return { ok: false, status: 422, errors: bomValidation.errors };
                    }
                    normalizedBom = bomValidation.bom;
                }

                const exists = await FormulaRepository.findDefinitionByKey(targetFormulaKey, transaction);
                if (exists) {
                    return { ok: false, status: 409, errors: [{ field: 'formulaKey', message: '系统编码冲突，请重试' }] };
                }

                const definition = await FormulaRepository.createDefinition({
                    formula_key: targetFormulaKey,
                    display_name: targetDisplayName,
                    category: '',
                    status: 'draft',
                    active_revision: null
                }, transaction);

                const revision = await FormulaRepository.createRevision({
                    formula_id: definition.id,
                    revision: 1,
                    state: 'draft',
                    payload_json: serializePayload({
                        formulaKey: targetFormulaKey,
                        displayName: targetDisplayName,
                        bom: normalizedBom
                    }),
                    change_note: changeNote || '初始草稿',
                    created_by: operator
                }, transaction);

                await FormulaRepository.createAuditLog({
                    formula_id: definition.id,
                    action: 'create',
                    from_revision: null,
                    to_revision: 1,
                    operator,
                    meta_json: JSON.stringify({ changeNote: changeNote || '' })
                }, transaction);

                return { ok: true, definition, revision };
            });
        } catch (error) {
            if (isFormulaKeyUniqueConflict(error) && attempt < maxAttempts) {
                continue;
            }
            if (isSqliteBusyError(error) && attempt < maxAttempts) {
                await wait(30 * attempt);
                continue;
            }
            if (isFormulaKeyUniqueConflict(error)) {
                return { ok: false, status: 409, errors: [{ field: 'formulaKey', message: '系统编码冲突，请重试' }] };
            }
            throw error;
        }
    }
    return { ok: false, status: 409, errors: [{ field: 'formulaKey', message: '系统编码冲突，请重试' }] };
}

async function updateDraft(formulaKey, { revision, formulaKey: nextFormulaKey, displayName, bom, changeNote, operator }) {
    return FormulaRepository.withTransaction(async (transaction) => {
        const definition = await FormulaRepository.findDefinitionByKey(formulaKey, transaction);
        if (!definition) {
            return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
        }

        const latest = await FormulaRepository.findLatestRevision(definition.id, transaction);
        const expectedRevision = Number(revision);
        if (!latest || Number(latest.revision) !== expectedRevision) {
            return {
                ok: false,
                status: 409,
                errors: [{ field: 'revision', message: '版本冲突，请刷新后重试' }],
                latestRevision: latest ? latest.revision : null
            };
        }

        const parsed = parsePayload(latest.payload_json);
        const targetFormulaKey = String(definition.formula_key || '').trim();
        const targetDisplayName = String(displayName || parsed.displayName || definition.display_name).trim();

        let normalizedBom = normalizeBom(bom);
        const baseErrors = validateBaseFields({
            formulaKey: targetFormulaKey,
            displayName: targetDisplayName
        });
        if (baseErrors.length > 0) {
            return { ok: false, status: 422, errors: baseErrors };
        }

        const bomValidation = await validateAndResolveBomWithMaterials(normalizedBom);
        if (bomValidation.errors.length > 0) {
            return { ok: false, status: 422, errors: bomValidation.errors };
        }
        normalizedBom = bomValidation.bom;

        const nextRevisionNumber = latest.revision + 1;
        const nextRevision = await FormulaRepository.createRevision({
            formula_id: definition.id,
            revision: nextRevisionNumber,
            state: 'draft',
            payload_json: serializePayload({
                formulaKey: targetFormulaKey,
                displayName: targetDisplayName,
                bom: normalizedBom
            }),
            change_note: changeNote || '更新草稿',
            created_by: operator
        }, transaction);

        await FormulaRepository.updateDefinition(definition.id, {
            status: 'draft',
            display_name: targetDisplayName
        }, transaction);

        await FormulaRepository.createAuditLog({
            formula_id: definition.id,
            action: 'update_draft',
            from_revision: latest.revision,
            to_revision: nextRevisionNumber,
            operator,
            meta_json: JSON.stringify({ changeNote: changeNote || '' })
        }, transaction);

        return { ok: true, revision: nextRevision };
    });
}

async function publish(formulaKey, { fromRevision, changeNote, operator }) {
    return FormulaRepository.withTransaction(async (transaction) => {
        const definition = await FormulaRepository.findDefinitionByKey(formulaKey, transaction);
        if (!definition) {
            return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
        }

        const sourceRevision = await FormulaRepository.findRevisionByNumber(definition.id, fromRevision, transaction);
        if (!sourceRevision) {
            return { ok: false, status: 404, errors: [{ field: 'fromRevision', message: '目标版本不存在' }] };
        }

        const payload = parsePayload(sourceRevision.payload_json);
        const baseErrors = validateBaseFields({
            formulaKey: definition.formula_key,
            displayName: payload.displayName || definition.display_name
        });
        if (baseErrors.length > 0) {
            return { ok: false, status: 422, errors: baseErrors };
        }

        const bomValidation = await validateAndResolveBomWithMaterials(payload.bom);
        if (bomValidation.errors.length > 0) {
            return { ok: false, status: 422, errors: bomValidation.errors };
        }
        const resolvedBom = bomValidation.bom;

        const latest = await FormulaRepository.findLatestRevision(definition.id, transaction);
        const nextRevisionNumber = (latest?.revision || 0) + 1;

        const revision = await FormulaRepository.createRevision({
            formula_id: definition.id,
            revision: nextRevisionNumber,
            state: 'published',
            payload_json: serializePayload({
                formulaKey: definition.formula_key,
                displayName: payload.displayName || definition.display_name,
                bom: resolvedBom
            }),
            change_note: changeNote || '发布版本',
            created_by: operator
        }, transaction);

        await FormulaRepository.updateDefinition(definition.id, {
            status: 'published',
            active_revision: nextRevisionNumber,
            display_name: payload.displayName || definition.display_name
        }, transaction);

        await FormulaRepository.createAuditLog({
            formula_id: definition.id,
            action: 'publish',
            from_revision: sourceRevision.revision,
            to_revision: nextRevisionNumber,
            operator,
            meta_json: JSON.stringify({ changeNote: changeNote || '' })
        }, transaction);

        return { ok: true, revision };
    });
}

async function archive(formulaKey, { reason, operator }) {
    return FormulaRepository.withTransaction(async (transaction) => {
        const definition = await FormulaRepository.findDefinitionByKey(formulaKey, transaction);
        if (!definition) {
            return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
        }

        await FormulaRepository.updateDefinition(definition.id, {
            status: 'archived'
        }, transaction);

        await FormulaRepository.createAuditLog({
            formula_id: definition.id,
            action: 'archive',
            from_revision: definition.active_revision,
            to_revision: definition.active_revision,
            operator,
            meta_json: JSON.stringify({ reason: reason || '' })
        }, transaction);

        return { ok: true };
    });
}

async function rollback(formulaKey, { targetRevision, reason, operator }) {
    return FormulaRepository.withTransaction(async (transaction) => {
        const definition = await FormulaRepository.findDefinitionByKey(formulaKey, transaction);
        if (!definition) {
            return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
        }

        const source = await FormulaRepository.findRevisionByNumber(definition.id, targetRevision, transaction);
        if (!source) {
            return { ok: false, status: 404, errors: [{ field: 'targetRevision', message: '回滚目标不存在' }] };
        }

        const latest = await FormulaRepository.findLatestRevision(definition.id, transaction);
        const nextRevisionNumber = (latest?.revision || 0) + 1;

        await FormulaRepository.createRevision({
            formula_id: definition.id,
            revision: nextRevisionNumber,
            state: 'published',
            payload_json: source.payload_json,
            change_note: `rollback:${reason || ''}`,
            created_by: operator
        }, transaction);

        await FormulaRepository.updateDefinition(definition.id, {
            status: 'published',
            active_revision: nextRevisionNumber
        }, transaction);

        await FormulaRepository.createAuditLog({
            formula_id: definition.id,
            action: 'rollback',
            from_revision: definition.active_revision,
            to_revision: nextRevisionNumber,
            operator,
            meta_json: JSON.stringify({ reason: reason || '', targetRevision: Number(targetRevision) })
        }, transaction);

        return { ok: true, revision: nextRevisionNumber };
    });
}

async function remove(formulaKey) {
    return FormulaRepository.withTransaction(async (transaction) => {
        const definition = await FormulaRepository.findDefinitionByKey(formulaKey, transaction);
        if (!definition) {
            return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
        }

        await FormulaRepository.destroyRevisions(definition.id, transaction);
        await FormulaRepository.destroyAuditLogs(definition.id, transaction);
        await FormulaRepository.destroyDefinition(definition.id, transaction);

        return { ok: true };
    });
}

async function listRevisions(formulaKey) {
    const definition = await FormulaRepository.findDefinitionByKey(formulaKey);
    if (!definition) return null;

    const revisions = await FormulaRepository.listRevisionsByFormulaId(definition.id);
    return revisions.map(toRevisionMeta);
}

async function getPublishedFormulasMap() {
    const definitions = await FormulaRepository.listDefinitionsByStatuses(['published']);
    if (!definitions.length) return {};

    const formulaIds = definitions.map((item) => item.id);
    const published = await FormulaRepository.listPublishedRevisionsByFormulaIds(formulaIds);
    const latestPublishedByFormulaId = new Map();
    for (const item of published) {
        if (!latestPublishedByFormulaId.has(item.formula_id)) {
            latestPublishedByFormulaId.set(item.formula_id, item);
        }
    }

    return toPublishedMap(definitions, latestPublishedByFormulaId, parsePayload);
}

module.exports = {
    operatorFromRequest,
    toRevisionMeta,
    listFormulas,
    getFormulaDetail,
    createFormula,
    updateDraft,
    publish,
    archive,
    rollback,
    remove,
    listRevisions,
    getPublishedFormulasMap
};
