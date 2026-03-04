const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { FormulaDefinition, FormulaRevision, FormulaAuditLog, Material } = require('../models');

const VALID_STATES = new Set(['draft', 'published', 'archived']);

function normalizeBom(input) {
    if (!Array.isArray(input)) return [];
    return input.map((item) => ({
        materialId: String(item.materialId || '').trim(),
        position: String(item.position || '').trim(),
        usage: {
            single: Number(item?.usage?.single ?? 0),
            double: Number(item?.usage?.double ?? 0),
            paired: Number(item?.usage?.paired ?? 0),
        }
    }));
}

function parsePayload(payloadText) {
    try {
        const parsed = JSON.parse(payloadText || '{}');
        return {
            formulaKey: String(parsed.formulaKey || '').trim(),
            displayName: String(parsed.displayName || '').trim(),
            category: String(parsed.category || 'Default').trim() || 'Default',
            bom: normalizeBom(parsed.bom || [])
        };
    } catch {
        return { formulaKey: '', displayName: '', category: 'Default', bom: [] };
    }
}

class FormulaService {
    static operatorFromRequest(req) {
        const fromHeader = req?.headers?.['x-operator'] || req?.headers?.['x-user'];
        return String(fromHeader || 'system-admin');
    }

    static async listFormulas({ keyword = '', category = '', status = '', page = 1, pageSize = 20 } = {}) {
        const where = {};
        if (status && VALID_STATES.has(status)) where.status = status;
        if (category) where.category = category;
        if (keyword) {
            where[Op.or] = [
                { formula_key: { [Op.like]: `%${keyword}%` } },
                { display_name: { [Op.like]: `%${keyword}%` } }
            ];
        }

        const limit = Math.max(1, Math.min(Number(pageSize) || 20, 200));
        const currentPage = Math.max(Number(page) || 1, 1);
        const offset = (currentPage - 1) * limit;

        const { rows, count } = await FormulaDefinition.findAndCountAll({
            where,
            order: [['updated_at', 'DESC']],
            limit,
            offset
        });

        return {
            items: rows.map((item) => ({
                id: item.id,
                formulaKey: item.formula_key,
                displayName: item.display_name,
                category: item.category,
                status: item.status,
                activeRevision: item.active_revision,
                updatedAt: item.updated_at
            })),
            total: count,
            page: currentPage,
            pageSize: limit
        };
    }

    static async getFormulaDetail(formulaKey) {
        const definition = await FormulaDefinition.findOne({
            where: { formula_key: formulaKey }
        });
        if (!definition) return null;

        const revisions = await FormulaRevision.findAll({
            where: { formula_id: definition.id },
            order: [['revision', 'DESC']]
        });
        const draftRevision = revisions[0] || null;
        const publishedRevision = revisions.find((r) => r.state === 'published') || null;

        const active = draftRevision || publishedRevision || revisions[0] || null;
        const payload = active ? parsePayload(active.payload_json) : {
            formulaKey: definition.formula_key,
            displayName: definition.display_name,
            category: definition.category,
            bom: []
        };

        return {
            formula: {
                id: definition.id,
                formulaKey: definition.formula_key,
                displayName: definition.display_name,
                category: definition.category,
                status: definition.status,
                activeRevision: definition.active_revision,
                bom: payload.bom,
                updatedAt: definition.updated_at
            },
            draftRevision: draftRevision ? this.toRevisionMeta(draftRevision) : null,
            publishedRevision: publishedRevision ? this.toRevisionMeta(publishedRevision) : null
        };
    }

    static toRevisionMeta(revision) {
        return {
            id: revision.id,
            revision: revision.revision,
            state: revision.state,
            changeNote: revision.change_note,
            createdBy: revision.created_by,
            createdAt: revision.created_at
        };
    }

    static async validateFormulaInput({ formulaKey, displayName, category, bom }) {
        const errors = [];
        if (!formulaKey) errors.push({ field: 'formulaKey', message: '配方编码不能为空' });
        if (!displayName) errors.push({ field: 'displayName', message: '配方名称不能为空' });
        if (!category) errors.push({ field: 'category', message: '分类不能为空' });
        if (!Array.isArray(bom) || bom.length === 0) {
            errors.push({ field: 'bom', message: 'BOM 不能为空' });
        }

        if (Array.isArray(bom)) {
            const seen = new Set();
            for (let i = 0; i < bom.length; i++) {
                const row = bom[i];
                if (!row.materialId) {
                    errors.push({ field: `bom[${i}].materialId`, message: '物料ID不能为空' });
                }
                if (!row.position) {
                    errors.push({ field: `bom[${i}].position`, message: '位置不能为空' });
                }
                ['single', 'double', 'paired'].forEach((key) => {
                    const val = Number(row?.usage?.[key]);
                    if (Number.isNaN(val) || val < 0) {
                        errors.push({ field: `bom[${i}].usage.${key}`, message: '用量必须为非负数' });
                    }
                });

                const dupKey = `${row.materialId}::${row.position}`;
                if (seen.has(dupKey)) {
                    errors.push({ field: `bom[${i}]`, message: '存在重复物料+位置组合' });
                }
                seen.add(dupKey);
            }

            const materialIds = [...new Set(bom.map((i) => i.materialId).filter(Boolean))];
            if (materialIds.length > 0) {
                const found = await Material.findAll({
                    where: { code: { [Op.in]: materialIds } },
                    attributes: ['code']
                });
                const foundCodes = new Set(found.map((m) => m.code));
                for (const materialId of materialIds) {
                    if (!foundCodes.has(materialId)) {
                        errors.push({ field: 'bom', message: `物料不存在: ${materialId}` });
                    }
                }
            }
        }

        return errors;
    }

    static serializePayload({ formulaKey, displayName, category, bom }) {
        return JSON.stringify({
            formulaKey,
            displayName,
            category,
            bom: normalizeBom(bom)
        });
    }

    static async createFormula({ formulaKey, displayName, category, bom, changeNote, operator }) {
        const errors = await this.validateFormulaInput({ formulaKey, displayName, category, bom });
        if (errors.length > 0) {
            return { ok: false, status: 422, errors };
        }

        return await sequelize.transaction(async (tx) => {
            const exists = await FormulaDefinition.findOne({
                where: { formula_key: formulaKey },
                transaction: tx
            });
            if (exists) {
                return { ok: false, status: 409, errors: [{ field: 'formulaKey', message: '配方编码已存在' }] };
            }

            const definition = await FormulaDefinition.create({
                formula_key: formulaKey,
                display_name: displayName,
                category,
                status: 'draft',
                active_revision: null
            }, { transaction: tx });

            const revision = await FormulaRevision.create({
                formula_id: definition.id,
                revision: 1,
                state: 'draft',
                payload_json: this.serializePayload({ formulaKey, displayName, category, bom }),
                change_note: changeNote || '初始草稿',
                created_by: operator
            }, { transaction: tx });

            await FormulaAuditLog.create({
                formula_id: definition.id,
                action: 'create',
                from_revision: null,
                to_revision: 1,
                operator,
                meta_json: JSON.stringify({ changeNote: changeNote || '' })
            }, { transaction: tx });

            return { ok: true, definition, revision };
        });
    }

    static async updateDraft(formulaKey, { revision, bom, changeNote, operator }) {
        return await sequelize.transaction(async (tx) => {
            const definition = await FormulaDefinition.findOne({
                where: { formula_key: formulaKey },
                transaction: tx
            });
            if (!definition) {
                return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
            }

            const latest = await FormulaRevision.findOne({
                where: { formula_id: definition.id },
                order: [['revision', 'DESC']],
                transaction: tx
            });

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
            const nextPayload = {
                formulaKey: definition.formula_key,
                displayName: definition.display_name,
                category: definition.category,
                bom: normalizeBom(bom)
            };
            const errors = await this.validateFormulaInput({
                formulaKey: nextPayload.formulaKey,
                displayName: parsed.displayName || definition.display_name,
                category: parsed.category || definition.category,
                bom: nextPayload.bom
            });
            if (errors.length > 0) return { ok: false, status: 422, errors };

            const nextRevisionNumber = latest.revision + 1;
            const nextRevision = await FormulaRevision.create({
                formula_id: definition.id,
                revision: nextRevisionNumber,
                state: 'draft',
                payload_json: this.serializePayload({
                    formulaKey: definition.formula_key,
                    displayName: parsed.displayName || definition.display_name,
                    category: parsed.category || definition.category,
                    bom: nextPayload.bom
                }),
                change_note: changeNote || '更新草稿',
                created_by: operator
            }, { transaction: tx });

            await FormulaDefinition.update({
                status: 'draft'
            }, {
                where: { id: definition.id },
                transaction: tx
            });

            await FormulaAuditLog.create({
                formula_id: definition.id,
                action: 'update_draft',
                from_revision: latest.revision,
                to_revision: nextRevisionNumber,
                operator,
                meta_json: JSON.stringify({ changeNote: changeNote || '' })
            }, { transaction: tx });

            return { ok: true, revision: nextRevision };
        });
    }

    static async publish(formulaKey, { fromRevision, changeNote, operator }) {
        return await sequelize.transaction(async (tx) => {
            const definition = await FormulaDefinition.findOne({
                where: { formula_key: formulaKey },
                transaction: tx
            });
            if (!definition) {
                return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
            }

            const sourceRevision = await FormulaRevision.findOne({
                where: {
                    formula_id: definition.id,
                    revision: Number(fromRevision)
                },
                transaction: tx
            });
            if (!sourceRevision) {
                return { ok: false, status: 404, errors: [{ field: 'fromRevision', message: '目标版本不存在' }] };
            }

            const payload = parsePayload(sourceRevision.payload_json);
            const errors = await this.validateFormulaInput({
                formulaKey: definition.formula_key,
                displayName: payload.displayName || definition.display_name,
                category: payload.category || definition.category,
                bom: payload.bom
            });
            if (errors.length > 0) return { ok: false, status: 422, errors };

            const latest = await FormulaRevision.findOne({
                where: { formula_id: definition.id },
                order: [['revision', 'DESC']],
                transaction: tx
            });
            const nextRevisionNumber = (latest?.revision || 0) + 1;
            const published = await FormulaRevision.create({
                formula_id: definition.id,
                revision: nextRevisionNumber,
                state: 'published',
                payload_json: this.serializePayload({
                    formulaKey: definition.formula_key,
                    displayName: payload.displayName || definition.display_name,
                    category: payload.category || definition.category,
                    bom: payload.bom
                }),
                change_note: changeNote || '发布版本',
                created_by: operator
            }, { transaction: tx });

            await FormulaDefinition.update({
                status: 'published',
                active_revision: nextRevisionNumber,
                display_name: payload.displayName || definition.display_name,
                category: payload.category || definition.category
            }, {
                where: { id: definition.id },
                transaction: tx
            });

            await FormulaAuditLog.create({
                formula_id: definition.id,
                action: 'publish',
                from_revision: sourceRevision.revision,
                to_revision: nextRevisionNumber,
                operator,
                meta_json: JSON.stringify({ changeNote: changeNote || '' })
            }, { transaction: tx });

            return { ok: true, revision: published };
        });
    }

    static async archive(formulaKey, { reason, operator }) {
        return await sequelize.transaction(async (tx) => {
            const definition = await FormulaDefinition.findOne({
                where: { formula_key: formulaKey },
                transaction: tx
            });
            if (!definition) {
                return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
            }

            await FormulaDefinition.update({
                status: 'archived'
            }, {
                where: { id: definition.id },
                transaction: tx
            });

            await FormulaAuditLog.create({
                formula_id: definition.id,
                action: 'archive',
                from_revision: definition.active_revision,
                to_revision: definition.active_revision,
                operator,
                meta_json: JSON.stringify({ reason: reason || '' })
            }, { transaction: tx });

            return { ok: true };
        });
    }

    static async rollback(formulaKey, { targetRevision, reason, operator }) {
        return await sequelize.transaction(async (tx) => {
            const definition = await FormulaDefinition.findOne({
                where: { formula_key: formulaKey },
                transaction: tx
            });
            if (!definition) {
                return { ok: false, status: 404, errors: [{ field: 'formulaKey', message: '配方不存在' }] };
            }
            const source = await FormulaRevision.findOne({
                where: { formula_id: definition.id, revision: Number(targetRevision) },
                transaction: tx
            });
            if (!source) {
                return { ok: false, status: 404, errors: [{ field: 'targetRevision', message: '回滚目标不存在' }] };
            }
            const latest = await FormulaRevision.findOne({
                where: { formula_id: definition.id },
                order: [['revision', 'DESC']],
                transaction: tx
            });
            const nextRevisionNumber = (latest?.revision || 0) + 1;
            await FormulaRevision.create({
                formula_id: definition.id,
                revision: nextRevisionNumber,
                state: 'published',
                payload_json: source.payload_json,
                change_note: `rollback:${reason || ''}`,
                created_by: operator
            }, { transaction: tx });

            await FormulaDefinition.update({
                status: 'published',
                active_revision: nextRevisionNumber
            }, {
                where: { id: definition.id },
                transaction: tx
            });

            await FormulaAuditLog.create({
                formula_id: definition.id,
                action: 'rollback',
                from_revision: definition.active_revision,
                to_revision: nextRevisionNumber,
                operator,
                meta_json: JSON.stringify({ reason: reason || '', targetRevision: Number(targetRevision) })
            }, { transaction: tx });

            return { ok: true, revision: nextRevisionNumber };
        });
    }

    static async listRevisions(formulaKey) {
        const definition = await FormulaDefinition.findOne({
            where: { formula_key: formulaKey }
        });
        if (!definition) return null;

        const revisions = await FormulaRevision.findAll({
            where: { formula_id: definition.id },
            order: [['revision', 'DESC']]
        });

        return revisions.map((r) => this.toRevisionMeta(r));
    }

    static async getPublishedFormulasMap() {
        const definitions = await FormulaDefinition.findAll({
            where: { status: { [Op.in]: ['published', 'draft', 'archived'] } }
        });
        if (!definitions.length) return {};

        const formulaIds = definitions.map((d) => d.id);
        const published = await FormulaRevision.findAll({
            where: {
                formula_id: { [Op.in]: formulaIds },
                state: 'published'
            },
            order: [['revision', 'DESC']]
        });

        const byFormulaId = new Map();
        for (const revision of published) {
            if (!byFormulaId.has(revision.formula_id)) {
                byFormulaId.set(revision.formula_id, revision);
            }
        }

        const mapping = {};
        for (const definition of definitions) {
            const revision = byFormulaId.get(definition.id);
            if (!revision) continue;
            const payload = parsePayload(revision.payload_json);
            mapping[definition.formula_key] = {
                displayName: payload.displayName || definition.display_name,
                category: payload.category || definition.category,
                bom: payload.bom
            };
        }

        return mapping;
    }

    static async writeAuditLog(formulaId, action, operator, meta = null) {
        await FormulaAuditLog.create({
            formula_id: formulaId,
            action,
            from_revision: null,
            to_revision: null,
            operator,
            meta_json: meta ? JSON.stringify(meta) : null
        });
    }
}

module.exports = FormulaService;
