const fs = require('fs');
const sequelize = require('../../config/database');
const { MaterialCatalogProfile, MaterialCatalogRevision } = require('../../models');
const { CONFIG_FILES } = require('../../config/paths');

function txOpts(transaction) {
    return transaction ? { transaction } : {};
}

class MaterialCatalogRepository {
    static withTransaction(handler) {
        return sequelize.transaction(handler);
    }

    static async findProfileByCode(profileCode = 'materials', transaction) {
        return MaterialCatalogProfile.findOne({
            where: { profile_code: profileCode },
            ...txOpts(transaction)
        });
    }

    static async createProfile(payload, transaction) {
        return MaterialCatalogProfile.create(payload, txOpts(transaction));
    }

    static async updateProfile(id, payload, transaction) {
        return MaterialCatalogProfile.update(payload, {
            where: { id },
            ...txOpts(transaction)
        });
    }

    static async findLatestRevision(profileId, transaction) {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findDraftRevision(profileId, transaction) {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId, state: 'draft' },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findPublishedRevision(profileId, transaction) {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId, state: 'published' },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async findRevisionByNumber(profileId, revision, transaction) {
        return MaterialCatalogRevision.findOne({
            where: { profile_id: profileId, revision: Number(revision) },
            ...txOpts(transaction)
        });
    }

    static async listRevisions(profileId, transaction) {
        return MaterialCatalogRevision.findAll({
            where: { profile_id: profileId },
            order: [['revision', 'DESC']],
            ...txOpts(transaction)
        });
    }

    static async createRevision(payload, transaction) {
        return MaterialCatalogRevision.create(payload, txOpts(transaction));
    }

    static async updateRevisionStates(profileId, currentState, nextState, transaction) {
        return MaterialCatalogRevision.update({
            state: nextState
        }, {
            where: { profile_id: profileId, state: currentState },
            ...txOpts(transaction)
        });
    }

    static readLegacyCatalog() {
        try {
            if (!fs.existsSync(CONFIG_FILES.materialsCatalog)) return {};
            const raw = fs.readFileSync(CONFIG_FILES.materialsCatalog, 'utf8');
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn('[materialCatalog] failed to read legacy materials catalog:', error);
            return {};
        }
    }

    static writeLegacyCatalog(payload) {
        fs.writeFileSync(CONFIG_FILES.materialsCatalog, JSON.stringify(payload || {}, null, 4));
    }
}

module.exports = MaterialCatalogRepository;
