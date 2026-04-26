import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type {
  MaterialCodeMappingAttributes,
  MaterialCodeMappingCreationAttributes,
} from './types';

const MaterialCodeMapping: ModelDefined<MaterialCodeMappingAttributes, MaterialCodeMappingCreationAttributes> = sequelize.define('MaterialCodeMapping', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  material_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mapping_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  party_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  party_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  external_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  normalized_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
  },
  metadata_json: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '{}',
  },
}, {
  tableName: 'material_code_mappings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['material_id'] },
    { fields: ['mapping_type', 'party_type', 'party_id', 'normalized_code', 'is_active'] },
    { fields: ['normalized_code', 'is_active'] },
  ],
});

export default MaterialCodeMapping;
