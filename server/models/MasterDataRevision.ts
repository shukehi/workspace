import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface MasterDataRevisionAttributes {
  id: number;
  profile_id: number;
  revision: number;
  state: 'draft' | 'published' | 'archived';
  payload_json: string;
  change_note?: string | null;
  created_by: string;
  created_at?: Date;
}

export interface MasterDataRevisionCreationAttributes {
  id?: number;
  profile_id: number;
  revision: number;
  state?: 'draft' | 'published' | 'archived';
  payload_json: string;
  change_note?: string | null;
  created_by?: string;
}

const MasterDataRevision: ModelDefined<MasterDataRevisionAttributes, MasterDataRevisionCreationAttributes> = sequelize.define('MasterDataRevision', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  profile_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  revision: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'draft',
  },
  payload_json: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
  },
  change_note: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'system-admin',
  },
}, {
  tableName: 'master_data_revisions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['profile_id', 'revision'] },
    { fields: ['profile_id', 'state'] },
  ],
});

export default MasterDataRevision;
