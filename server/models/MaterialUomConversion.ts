import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type {
  MaterialUomConversionAttributes,
  MaterialUomConversionCreationAttributes,
} from './types';

const MaterialUomConversion: ModelDefined<MaterialUomConversionAttributes, MaterialUomConversionCreationAttributes> = sequelize.define('MaterialUomConversion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  material_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  from_unit: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  to_unit: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  factor: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1,
  },
  is_purchase_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  is_sales_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'material_uom_conversions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['material_id'] },
    { fields: ['material_id', 'from_unit', 'to_unit', 'is_active'] },
  ],
});

export default MaterialUomConversion;
