import type { Transaction } from 'sequelize';

import type {
    FormulaAuditLogAttributes,
    FormulaAuditLogCreationAttributes,
    FormulaDefinitionAttributes,
    FormulaDefinitionCreationAttributes,
    FormulaRevisionAttributes,
    FormulaRevisionCreationAttributes,
    MaterialAttributes,
} from '../../models/types';

const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { FormulaDefinition, FormulaRevision, FormulaAuditLog, Material } = require('../../models');

function txOpts(transaction?: Transaction) {
    return transaction ? { transaction } : {};
}

interface DefinitionListQuery {
    where: Record<string, unknown>;
    limit: number;
    offset: number;
}

interface DefinitionListResult {
    count: number;
    rows: FormulaDefinitionAttributes[];
}

class FormulaRepository {
    static withTransaction<T>(handler: (transaction: Transaction) => Promise<T>): Promise<T> {
        return sequelize.transaction(handler);
    }

    static async listDefinitions({ where, limit, offset }: DefinitionListQuery): Promise<DefinitionListResult> {
        return FormulaDefinition.findAndCountAll({
            where,
            order: [['updated_at', 'DESC']],
            limit,
            offset
        });
    }

    static async listDefinitionsByStatuses(statuses: string[]): Promise<FormulaDefinitionAttributes[]> {
        return FormulaDefinition.findAll({
            where: { status: { [Op.in]: statuses } }
        });
    }

    static async listDefinitionKeysByPrefix(
        prefix: string,
        transaction?: Transaction,
    ): Promise<Array<Pick<FormulaDefinitionAttributes, 'id' | 'formula_key'>>> {
        return FormulaDefinition.findAll({
            where: { formula_key: { [Op.like]: `${prefix}%` } },
            attributes: ['id', 'formula_key'],
            ...txOpts(transaction)
        });
    }

    static async findDefinitionByKey(
        formulaKey: string,
        transaction?: Transaction,
    ): Promise<FormulaDefinitionAttributes | null> {
        return FormulaDefinition.findOne({
            where: { formula_key: formulaKey },
            ...txOpts(transaction)
        });
    }

    static async createDefinition(
        payload: FormulaDefinitionCreationAttributes,
        transaction?: Transaction,
    ): Promise<FormulaDefinitionAttributes> {
        return FormulaDefinition.create(payload, txOpts(transaction));
    }

    static async updateDefinition(
        id: number,
        payload: Partial<FormulaDefinitionAttributes>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return FormulaDefinition.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async destroyDefinition(id: number, transaction?: Transaction): Promise<number> {
        return FormulaDefinition.destroy({
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async listRevisionsByFormulaId(
        formulaId: number,
        transaction?: Transaction,
    ): Promise<FormulaRevisionAttributes[]> {
        return FormulaRevision.findAll({
            where: { formula_id: formulaId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findLatestRevision(
        formulaId: number,
        transaction?: Transaction,
    ): Promise<FormulaRevisionAttributes | null> {
        return FormulaRevision.findOne({
            where: { formula_id: formulaId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findRevisionByNumber(
        formulaId: number,
        revision: number | string,
        transaction?: Transaction,
    ): Promise<FormulaRevisionAttributes | null> {
        return FormulaRevision.findOne({
            where: {
                formula_id: formulaId,
                revision: Number(revision)
            },
            ...txOpts(transaction)
        });
    }

    static async createRevision(
        payload: FormulaRevisionCreationAttributes,
        transaction?: Transaction,
    ): Promise<FormulaRevisionAttributes> {
        return FormulaRevision.create(payload, txOpts(transaction));
    }

    static async destroyRevisions(formulaId: number, transaction?: Transaction): Promise<number> {
        return FormulaRevision.destroy({
            where: { formula_id: formulaId },
            ...txOpts(transaction)
        });
    }

    static async listPublishedRevisionsByFormulaIds(formulaIds: number[]): Promise<FormulaRevisionAttributes[]> {
        return FormulaRevision.findAll({
            where: {
                formula_id: { [Op.in]: formulaIds },
                state: 'published'
            },
            order: [['revision', 'DESC']]
        });
    }

    static async createAuditLog(
        payload: FormulaAuditLogCreationAttributes,
        transaction?: Transaction,
    ): Promise<FormulaAuditLogAttributes> {
        return FormulaAuditLog.create(payload, txOpts(transaction));
    }

    static async destroyAuditLogs(formulaId: number, transaction?: Transaction): Promise<number> {
        return FormulaAuditLog.destroy({
            where: { formula_id: formulaId },
            ...txOpts(transaction)
        });
    }

    static async findMaterialsByCodes(codes: string[]): Promise<Array<Pick<MaterialAttributes, 'code'>>> {
        if (!codes.length) return [];
        return Material.findAll({
            where: { code: { [Op.in]: codes } },
            attributes: ['code']
        });
    }
}

module.exports = FormulaRepository;
