import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface SupplierMasterAttributes {
  id: number;
  supplier_name: string;
  normalized_name: string;
  status: 'active' | 'inactive';
  source_note?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface SupplierMasterCreationAttributes {
  id?: number;
  supplier_name: string;
  normalized_name: string;
  status?: 'active' | 'inactive';
  source_note?: string | null;
}

const SupplierMaster: ModelDefined<SupplierMasterAttributes, SupplierMasterCreationAttributes> = sequelize.define('SupplierMaster', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  supplier_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  normalized_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
  },
  source_note: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'supplier_masters',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['supplier_name'] },
    { unique: true, fields: ['normalized_name'] },
    { fields: ['status'] },
  ],
});

export default SupplierMaster;
