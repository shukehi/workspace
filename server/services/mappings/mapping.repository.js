const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const {
    MappingProfile,
    MappingRevision,
    MappingAuditLog
} = require('../../models');
const { REVISION_STATES } = require('./mapping.constants');

function txOpts(transaction) {
    return transaction ? { transaction } : {};
}

class MappingRepository {
    static withTransaction(handler) {
        return sequelize.transaction(handler);
    }

    static async findProfileByCode(profileCode, transaction) {
        return MappingProfile.findOne({
            where: { profile_code: profileCode },
            ...txOpts(transaction)
        });
    }

    static async createProfile(payload, transaction) {
        return MappingProfile.create(payload, txOpts(transaction));
    }

    static async listProfiles({ where = {}, limit, offset } = {}, transaction) {
        const query = {
            where,
            order: [['profile_code', 'ASC']],
            ...txOpts(transaction)
        };
        if (limit !== undefined) query.limit = limit;
        if (offset !== undefined) query.offset = offset;
        return MappingProfile.findAll(query);
    }

    static async listRevisionsByProfileId(profileId, transaction) {
        return MappingRevision.findAll({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findRevisionByProfileIdAndRevision(profileId, revision, transaction) {
        return MappingRevision.findOne({
            where: {
                profile_id: profileId,
                revision: Number(revision)
            },
            ...txOpts(transaction)
        });
    }

    static async findLatestRevisionByProfileId(profileId, transaction) {
        return MappingRevision.findOne({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findDraftRevisionByProfileId(profileId, transaction) {
        return MappingRevision.findOne({
            where: {
                profile_id: profileId,
                state: REVISION_STATES.DRAFT
            },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findPublishedRevisionByProfileId(profileId, transaction) {
        return MappingRevision.findOne({
            where: {
                profile_id: profileId,
                state: REVISION_STATES.PUBLISHED
            },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async createRevision(payload, transaction) {
        return MappingRevision.create(payload, txOpts(transaction));
    }

    static async updateRevision(id, payload, transaction) {
        return MappingRevision.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async updateRevisionStates(profileId, currentState, nextState, transaction) {
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

    static async updateProfile(id, payload, transaction) {
        return MappingProfile.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async createAuditLog(payload, transaction) {
        return MappingAuditLog.create(payload, txOpts(transaction));
    }

    static async listPublishedRevisionsByProfileIds(profileIds, transaction) {
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

module.exports = MappingRepository;
