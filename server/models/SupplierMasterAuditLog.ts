import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface SupplierMasterAuditLogAttributes {
  id: number;
  supplier_master_id: number;
  action: string;
  operator: string;
  meta_json?: string | null;
  created_at?: Date;
}

export interface SupplierMasterAuditLogCreationAttributes {
  id?: number;
  supplier_master_id: number;
  action: string;
  operator?: string;
  meta_json?: string | null;
}

const SupplierMasterAuditLog: ModelDefined<SupplierMasterAuditLogAttributes, SupplierMasterAuditLogCreationAttributes> = sequelize.define('SupplierMasterAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  supplier_master_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  operator: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'system-admin',
  },
  meta_json: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'supplier_master_audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default SupplierMasterAuditLog;
