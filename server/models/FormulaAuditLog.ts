import type { ModelDefined } from 'sequelize';

import type {
    FormulaAuditLogAttributes,
    FormulaAuditLogCreationAttributes,
} from './types';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FormulaAuditLog: ModelDefined<FormulaAuditLogAttributes, FormulaAuditLogCreationAttributes> = sequelize.define('FormulaAuditLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    formula_id: {
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
    tableName: 'formula_audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = FormulaAuditLog;
