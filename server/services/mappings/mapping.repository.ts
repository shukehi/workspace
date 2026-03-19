import type { Transaction } from 'sequelize';
import type {
    MappingAuditLogAttributes,
    MappingAuditLogCreationAttributes,
    MappingProfileAttributes,
    MappingProfileCreationAttributes,
    MappingRevisionAttributes,
    MappingRevisionCreationAttributes,
    MappingRevisionState,
} from '../../models/types';

import { Op } from 'sequelize';
import sequelize from '../../config/database';
import { MappingProfile, MappingRevision, MappingAuditLog } from '../../models';
import { REVISION_STATES } from './mapping.constants';

function txOpts(transaction?: Transaction) {
    return transaction ? { transaction } : {};
}

interface ProfileListQuery {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
}

class MappingRepository {
    static withTransaction<T>(handler: (transaction: Transaction) => Promise<T>): Promise<T> {
        return sequelize.transaction(handler);
    }

    static async findProfileByCode(
        profileCode: string,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingProfile.findOne({
            where: { profile_code: profileCode },
            ...txOpts(transaction)
        });
    }

    static async createProfile(
        payload: MappingProfileCreationAttributes,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingProfile.create(payload, txOpts(transaction));
    }

    static async listProfiles(
        { where = {}, limit, offset }: ProfileListQuery = {},
        transaction?: Transaction,
    ): Promise<any[]> {
        const query: {
            where: Record<string, unknown>;
            order: string[][];
            transaction?: Transaction;
            limit?: number;
            offset?: number;
        } = {
            where,
            order: [['profile_code', 'ASC']] as any,
            ...txOpts(transaction)
        };
        if (limit !== undefined) query.limit = limit;
        if (offset !== undefined) query.offset = offset;
        return MappingProfile.findAll(query as any);
    }

    static async listRevisionsByProfileId(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any[]> {
        return MappingRevision.findAll({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findRevisionByProfileIdAndRevision(
        profileId: number,
        revision: number | string,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingRevision.findOne({
            where: {
                profile_id: profileId,
                revision: Number(revision)
            },
            ...txOpts(transaction)
        });
    }

    static async findLatestRevisionByProfileId(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingRevision.findOne({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findDraftRevisionByProfileId(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingRevision.findOne({
            where: {
                profile_id: profileId,
                state: REVISION_STATES.DRAFT
            },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findPublishedRevisionByProfileId(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingRevision.findOne({
            where: {
                profile_id: profileId,
                state: REVISION_STATES.PUBLISHED
            },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async createRevision(
        payload: MappingRevisionCreationAttributes,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingRevision.create(payload, txOpts(transaction));
    }

    static async updateRevision(
        id: number,
        payload: Partial<MappingRevisionAttributes>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return MappingRevision.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async updateRevisionStates(
        profileId: number,
        currentState: MappingRevisionState,
        nextState: MappingRevisionState,
        transaction?: Transaction,
    ): Promise<[number]> {
        return MappingRevision.update({
            state: nextState
        }, {
            where: {
                profile_id: profileId,
                state: currentState
            },
            ...txOpts(transaction)
        });
    }

    static async updateProfile(
        id: number,
        payload: Partial<MappingProfileAttributes>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return MappingProfile.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async createAuditLog(
        payload: MappingAuditLogCreationAttributes,
        transaction?: Transaction,
    ): Promise<any> {
        return MappingAuditLog.create(payload, txOpts(transaction));
    }

    static async listAuditLogsByProfileId(
        profileId: number,
        transaction?: Transaction,
    ): Promise<any[]> {
        return MappingAuditLog.findAll({
            where: { profile_id: profileId },
            order: [['created_at', 'DESC'], ['id', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async listPublishedRevisionsByProfileIds(
        profileIds: number[],
        transaction?: Transaction,
    ): Promise<any[]> {
        if (!profileIds.length) return [];
        return MappingRevision.findAll({
            where: {
                profile_id: { [Op.in]: profileIds },
                state: REVISION_STATES.PUBLISHED
            },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }
}

export default MappingRepository;

// CJS interop: ensure require() returns the repository directly
module.exports = MappingRepository;
