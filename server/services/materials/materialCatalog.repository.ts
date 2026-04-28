import type { Transaction } from 'sequelize';
import type {
    MaterialCatalogAuditLogAttributes,
    MaterialCatalogAuditLogCreationAttributes,
    MaterialCatalogProfileAttributes,
    MaterialCatalogProfileCreationAttributes,
    MaterialCatalogRevisionAttributes,
    MaterialCatalogRevisionCreationAttributes,
    MaterialCatalogRevisionState,
} from '../../models/types';

import sequelize from '../../config/database';
import { MaterialCatalogProfile, MaterialCatalogRevision, MaterialCatalogAuditLog } from '../../models';

function txOpts(transaction?: Transaction) {
    return transaction ? { transaction } : {};
}

class MaterialCatalogRepository {
    static withTransaction<T>(handler: (transaction: Transaction) => Promise<T>): Promise<T> {
        return sequelize.transaction(handler);
    }

    static async findProfileByCode(
        profileCode = 'materials',
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogProfile.findOne({
            where: { profile_code: profileCode },
            ...txOpts(transaction)
        });
    }

    static async createProfile(
        payload: MaterialCatalogProfileCreationAttributes,
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogProfile.create(payload, txOpts(transaction));
    }

    static async updateProfile(
        id: number,
        payload: Partial<MaterialCatalogProfileAttributes>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return MaterialCatalogProfile.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async findLatestRevision(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findDraftRevision(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId, state: 'draft' },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findPublishedRevision(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId, state: 'published' },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findRevisionByNumber(
        profileId: number,
        revision: number | string,
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId, revision: Number(revision) },
            ...txOpts(transaction)
        });
    }

    static async listRevisions(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any[]> {
        return MaterialCatalogRevision.findAll({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async createRevision(
        payload: MaterialCatalogRevisionCreationAttributes,
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogRevision.create(payload, txOpts(transaction));
    }

    static async updateRevisionStates(
        profileId: number,
        currentState: MaterialCatalogRevisionState,
        nextState: MaterialCatalogRevisionState,
        transaction?: Transaction,
    ): Promise<[number]> {
        return MaterialCatalogRevision.update({
            state: nextState
        }, {
            where: { profile_id: profileId, state: currentState },
            ...txOpts(transaction)
        });
    }

    static async createAuditLog(
        payload: MaterialCatalogAuditLogCreationAttributes,
        transaction?: Transaction,
    ): Promise<any> {
        return MaterialCatalogAuditLog.create(payload, txOpts(transaction));
    }

    static async listAuditLogs(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any[]> {
        return MaterialCatalogAuditLog.findAll({
            where: { profile_id: profileId },
            order: [['id', 'DESC']],
            ...txOpts(transaction)
        });
    }
}

export default MaterialCatalogRepository;
