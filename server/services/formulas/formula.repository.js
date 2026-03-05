const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { FormulaDefinition, FormulaRevision, FormulaAuditLog, Material } = require('../../models');

function txOpts(transaction) {
    return transaction ? { transaction } : {};
}

class FormulaRepository {
    static withTransaction(handler) {
        return sequelize.transaction(handler);
    }

    static async listDefinitions({ where, limit, offset }) {
        return FormulaDefinition.findAndCountAll({
            where,
            order: [['updated_at', 'DESC']],
            limit,
            offset
        });
    }

    static async listDefinitionsByStatuses(statuses) {
        return FormulaDefinition.findAll({
            where: { status: { [Op.in]: statuses } }
        });
    }

    static async listDefinitionKeysByPrefix(prefix, transaction) {
        return FormulaDefinition.findAll({
            where: { formula_key: { [Op.like]: `${prefix}%` } },
            attributes: ['id', 'formula_key'],
            ...txOpts(transaction)
        });
    }

    static async findDefinitionByKey(formulaKey, transaction) {
        return FormulaDefinition.findOne({
            where: { formula_key: formulaKey },
            ...txOpts(transaction)
        });
    }

    static async createDefinition(payload, transaction) {
        return FormulaDefinition.create(payload, txOpts(transaction));
    }

    static async updateDefinition(id, payload, transaction) {
        return FormulaDefinition.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async destroyDefinition(id, transaction) {
        return FormulaDefinition.destroy({
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async listRevisionsByFormulaId(formulaId, transaction) {
        return FormulaRevision.findAll({
            where: { formula_id: formulaId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findLatestRevision(formulaId, transaction) {
        return FormulaRevision.findOne({
            where: { formula_id: formulaId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findRevisionByNumber(formulaId, revision, transaction) {
        return FormulaRevision.findOne({
            where: {
                formula_id: formulaId,
                revision: Number(revision)
            },
            ...txOpts(transaction)
        });
    }

    static async createRevision(payload, transaction) {
        return FormulaRevision.create(payload, txOpts(transaction));
    }

    static async destroyRevisions(formulaId, transaction) {
        return FormulaRevision.destroy({
            where: { formula_id: formulaId },
            ...txOpts(transaction)
        });
    }

    static async listPublishedRevisionsByFormulaIds(formulaIds) {
        return FormulaRevision.findAll({
            where: {
                formula_id: { [Op.in]: formulaIds },
                state: 'published'
            },
            order: [['revision', 'DESC']]
        });
    }

    static async createAuditLog(payload, transaction) {
        return FormulaAuditLog.create(payload, txOpts(transaction));
    }

    static async destroyAuditLogs(formulaId, transaction) {
        return FormulaAuditLog.destroy({
            where: { formula_id: formulaId },
            ...txOpts(transaction)
        });
    }

    static async findMaterialsByCodes(codes) {
        if (!codes.length) return [];
        return Material.findAll({
            where: { code: { [Op.in]: codes } },
            attributes: ['code']
        });
    }
}

module.exports = FormulaRepository;
