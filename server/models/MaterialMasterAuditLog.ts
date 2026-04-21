import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface MaterialMasterAuditLogAttributes {
  id: number;
  material_id: number;
  action: string;
  operator: string;
  meta_json?: string | null;
  created_at?: Date;
}

export interface MaterialMasterAuditLogCreationAttributes {
  id?: number;
  material_id: number;
  action: string;
  operator?: string;
  meta_json?: string | null;
}

const MaterialMasterAuditLog: ModelDefined<MaterialMasterAuditLogAttributes, MaterialMasterAuditLogCreationAttributes> = sequelize.define('MaterialMasterAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  material_id: {
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
  tableName: 'material_master_audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

export default MaterialMasterAuditLog;
