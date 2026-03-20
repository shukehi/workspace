import type { ModelDefined } from 'sequelize';
import type {
    MappingAuditLogAttributes,
    MappingAuditLogCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const MappingAuditLog: ModelDefined<MappingAuditLogAttributes, MappingAuditLogCreationAttributes> = sequelize.define('MappingAuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    profile_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    from_revision: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    to_revision: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    operator: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'system-admin'
    },
    meta_json: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'mapping_audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

export default MappingAuditLog;
