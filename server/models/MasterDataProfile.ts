import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface MasterDataProfileAttributes {
  id: number;
  profile_code: string;
  display_name: string;
  status: string;
  active_revision?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface MasterDataProfileCreationAttributes {
  id?: number;
  profile_code: string;
  display_name: string;
  status?: string;
  active_revision?: number | null;
}

const MasterDataProfile: ModelDefined<MasterDataProfileAttributes, MasterDataProfileCreationAttributes> = sequelize.define('MasterDataProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  profile_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  display_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
  },
  active_revision: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'master_data_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default MasterDataProfile;
