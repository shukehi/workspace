import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type {
  MaterialSupplierMappingAttributes,
  MaterialSupplierMappingCreationAttributes,
} from './types';

const MaterialSupplierMapping: ModelDefined<MaterialSupplierMappingAttributes, MaterialSupplierMappingCreationAttributes> = sequelize.define('MaterialSupplierMapping', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  material_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  supplier_master_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  supplier_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  normalized_supplier_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  supplier_name_snapshot: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  supplier_model: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  purchase_unit: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stock_unit: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  conversion_factor: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'material_supplier_mappings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['material_id'] },
    { fields: ['supplier_master_id'] },
    { fields: ['supplier_master_id', 'normalized_supplier_code', 'is_active'] },
  ],
});

export default MaterialSupplierMapping;
