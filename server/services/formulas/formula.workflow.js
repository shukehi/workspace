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

async function validateBomWithMaterials(bom) {
    const materialIds = [...new Set(normalizeBom(bom).map((item) => item.materialId).filter(Boolean))];
    const found = await FormulaRepository.findMaterialsByCodes(materialIds);
    const materialCodes = new Set(found.map((item) => item.code));
    return validateBomRows({ bom, allowEmptyBom: false, materialCodeSet: materialCodes });
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
    const baseErrors = validateBaseFields({ formulaKey, displayName });
    if (baseErrors.length > 0) {
        return { ok: false, status: 422, errors: baseErrors };
    }

    const normalizedBom = filterMeaningfulBomRows(bom);
    if (normalizedBom.length > 0) {
        const bomErrors = await validateBomWithMaterials(normalizedBom);
        if (bomErrors.length > 0) {
            return { ok: false, status: 422, errors: bomErrors };
        }
    }

    return FormulaRepository.withTransaction(async (transaction) => {
        const exists = await FormulaRepository.findDefinitionByKey(formulaKey, transaction);
        if (exists) {
            return { ok: false, status: 409, errors: [{ field: 'formulaKey', message: '配方编码已存在' }] };
        }

        const definition = await FormulaRepository.createDefinition({
            formula_key: formulaKey,
            display_name: displayName,
            category: '',
            status: 'draft',
            active_revision: null
        }, transaction);

        const revision = await FormulaRepository.createRevision({
            formula_id: definition.id,
            revision: 1,
            state: 'draft',
            payload_json: serializePayload({
                formulaKey,
                displayName,
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
        const targetFormulaKey = String(nextFormulaKey || definition.formula_key).trim();
        const targetDisplayName = String(displayName || parsed.displayName || definition.display_name).trim();

        if (targetFormulaKey !== definition.formula_key) {
            const existing = await FormulaRepository.findDefinitionByKey(targetFormulaKey, transaction);
            if (existing) {
                return { ok: false, status: 409, errors: [{ field: 'formulaKey', message: '配方编码已存在' }] };
            }
        }

        const normalizedBom = normalizeBom(bom);
        const baseErrors = validateBaseFields({
            formulaKey: targetFormulaKey,
            displayName: targetDisplayName
        });
        if (baseErrors.length > 0) {
            return { ok: false, status: 422, errors: baseErrors };
        }

        const bomErrors = await validateBomWithMaterials(normalizedBom);
        if (bomErrors.length > 0) {
            return { ok: false, status: 422, errors: bomErrors };
        }

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
            formula_key: targetFormulaKey,
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

        const bomErrors = await validateBomWithMaterials(payload.bom);
        if (bomErrors.length > 0) {
            return { ok: false, status: 422, errors: bomErrors };
        }

        const latest = await FormulaRepository.findLatestRevision(definition.id, transaction);
        const nextRevisionNumber = (latest?.revision || 0) + 1;

        const revision = await FormulaRepository.createRevision({
            formula_id: definition.id,
            revision: nextRevisionNumber,
            state: 'published',
            payload_json: serializePayload({
                formulaKey: definition.formula_key,
                displayName: payload.displayName || definition.display_name,
                bom: payload.bom
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
    const definitions = await FormulaRepository.listDefinitionsByStatuses(['published', 'draft', 'archived']);
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
