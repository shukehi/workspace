import type { Transaction } from 'sequelize';

import type {
    FormulaAuditLogCreationAttributes,
    FormulaDefinitionAttributes,
    FormulaDefinitionCreationAttributes,
    FormulaRevisionCreationAttributes,
} from '../../models/types';
import type {
    FormulaDefinitionInstance,
    FormulaRevisionInstance,
    FormulaAuditLogInstance,
    MaterialInstance,
} from '../../models';

import { Op } from 'sequelize';
import sequelize from '../../config/database';
import { FormulaDefinition, FormulaRevision, FormulaAuditLog, Material } from '../../models';

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
    rows: FormulaDefinitionInstance[];
}

class FormulaRepository {
    static withTransaction<T>(handler: (transaction: Transaction) => Promise<T>): Promise<T> {
        return sequelize.transaction(handler);
    }

    static async listDefinitions({ where, limit, offset }: DefinitionListQuery): Promise<DefinitionListResult> {
        return await FormulaDefinition.findAndCountAll({
            where,
            order: [['updated_at', 'DESC']],
            limit,
            offset
        }) as unknown as DefinitionListResult;
    }

    static async listDefinitionsByStatuses(statuses: string[]): Promise<FormulaDefinitionInstance[]> {
        return await FormulaDefinition.findAll({
            where: { status: { [Op.in]: statuses } }
        }) as unknown as FormulaDefinitionInstance[];
    }

    static async listDefinitionKeysByPrefix(
        prefix: string,
        transaction?: Transaction,
    ): Promise<Array<Pick<FormulaDefinitionAttributes, 'id' | 'formula_key'>>> {
        return await FormulaDefinition.findAll({
            where: { formula_key: { [Op.like]: `${prefix}%` } },
            attributes: ['id', 'formula_key'],
            ...txOpts(transaction)
        }) as unknown as Array<Pick<FormulaDefinitionAttributes, 'id' | 'formula_key'>>;
    }

    static async findDefinitionByKey(
        formulaKey: string,
        transaction?: Transaction,
    ): Promise<FormulaDefinitionInstance | null> {
        return await FormulaDefinition.findOne({
            where: { formula_key: formulaKey },
            ...txOpts(transaction)
        }) as unknown as FormulaDefinitionInstance | null;
    }

    static async createDefinition(
        payload: FormulaDefinitionCreationAttributes,
        transaction?: Transaction,
    ): Promise<FormulaDefinitionInstance> {
        return await FormulaDefinition.create(payload, txOpts(transaction)) as unknown as FormulaDefinitionInstance;
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
    ): Promise<FormulaRevisionInstance[]> {
        return await FormulaRevision.findAll({
            where: { formula_id: formulaId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        }) as unknown as FormulaRevisionInstance[];
    }

    static async findLatestRevision(
        formulaId: number,
        transaction?: Transaction,
    ): Promise<FormulaRevisionInstance | null> {
        return await FormulaRevision.findOne({
            where: { formula_id: formulaId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        }) as unknown as FormulaRevisionInstance | null;
    }

    static async findRevisionByNumber(
        formulaId: number,
        revision: number | string,
        transaction?: Transaction,
    ): Promise<FormulaRevisionInstance | null> {
        return await FormulaRevision.findOne({
            where: {
                formula_id: formulaId,
                revision: Number(revision)
            },
            ...txOpts(transaction)
        }) as unknown as FormulaRevisionInstance | null;
    }

    static async createRevision(
        payload: FormulaRevisionCreationAttributes,
        transaction?: Transaction,
    ): Promise<FormulaRevisionInstance> {
        return await FormulaRevision.create(payload, txOpts(transaction)) as unknown as FormulaRevisionInstance;
    }

    static async destroyRevisions(formulaId: number, transaction?: Transaction): Promise<number> {
        return FormulaRevision.destroy({
            where: { formula_id: formulaId },
            ...txOpts(transaction)
        });
    }

    static async listPublishedRevisionsByFormulaIds(formulaIds: number[]): Promise<FormulaRevisionInstance[]> {
        return await FormulaRevision.findAll({
            where: {
                formula_id: { [Op.in]: formulaIds },
                state: 'published'
            },
            order: [['revision', 'DESC']]
        }) as unknown as FormulaRevisionInstance[];
    }

    static async createAuditLog(
        payload: FormulaAuditLogCreationAttributes,
        transaction?: Transaction,
    ): Promise<FormulaAuditLogInstance> {
        return await FormulaAuditLog.create(payload, txOpts(transaction)) as unknown as FormulaAuditLogInstance;
    }

    static async destroyAuditLogs(formulaId: number, transaction?: Transaction): Promise<number> {
        return FormulaAuditLog.destroy({
            where: { formula_id: formulaId },
            ...txOpts(transaction)
        });
    }

    static async findMaterialsByCodes(codes: string[]): Promise<Array<Pick<MaterialInstance, 'code'>>> {
        if (!codes.length) return [];
        return await Material.findAll({
            where: { code: { [Op.in]: codes } },
            attributes: ['code']
        }) as unknown as Array<Pick<MaterialInstance, 'code'>>;
    }
}

export default FormulaRepository;
