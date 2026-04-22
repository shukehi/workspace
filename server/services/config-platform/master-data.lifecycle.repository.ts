import type { Transaction } from 'sequelize';
import sequelize from '../../config/database';
import { MasterDataProfile, MasterDataRevision } from '../../models';

function txOpts(transaction?: Transaction) {
  return transaction ? { transaction } : {};
}

class MasterDataLifecycleRepository {
  static withTransaction<T>(handler: (transaction: Transaction) => Promise<T>): Promise<T> {
    return sequelize.transaction(handler);
  }

  static async findProfileByCode(profileCode: string, transaction?: Transaction) {
    return MasterDataProfile.findOne({ where: { profile_code: profileCode }, ...txOpts(transaction) });
  }

  static async createProfile(payload: Record<string, unknown>, transaction?: Transaction) {
    return MasterDataProfile.create(payload as any, txOpts(transaction));
  }

  static async updateProfile(id: number, payload: Record<string, unknown>, transaction?: Transaction) {
    return MasterDataProfile.update(payload as any, { where: { id }, ...txOpts(transaction) });
  }

  static async findLatestRevision(profileId: number, transaction?: Transaction) {
    return MasterDataRevision.findOne({ where: { profile_id: profileId }, order: [['revision', 'DESC']], ...txOpts(transaction) });
  }

  static async findDraftRevision(profileId: number, transaction?: Transaction) {
    return MasterDataRevision.findOne({ where: { profile_id: profileId, state: 'draft' }, order: [['revision', 'DESC']], ...txOpts(transaction) });
  }

  static async findPublishedRevision(profileId: number, transaction?: Transaction) {
    return MasterDataRevision.findOne({ where: { profile_id: profileId, state: 'published' }, order: [['revision', 'DESC']], ...txOpts(transaction) });
  }

  static async findRevisionByNumber(profileId: number, revision: number | string, transaction?: Transaction) {
    return MasterDataRevision.findOne({ where: { profile_id: profileId, revision: Number(revision) }, ...txOpts(transaction) });
  }

  static async listRevisions(profileId: number, transaction?: Transaction) {
    return MasterDataRevision.findAll({ where: { profile_id: profileId }, order: [['revision', 'DESC']], ...txOpts(transaction) });
  }

  static async createRevision(payload: Record<string, unknown>, transaction?: Transaction) {
    return MasterDataRevision.create(payload as any, txOpts(transaction));
  }

  static async updateRevisionStates(profileId: number, currentState: 'draft' | 'published' | 'archived', nextState: 'draft' | 'published' | 'archived', transaction?: Transaction) {
    return MasterDataRevision.update({ state: nextState }, { where: { profile_id: profileId, state: currentState }, ...txOpts(transaction) });
  }
}

export default MasterDataLifecycleRepository;
