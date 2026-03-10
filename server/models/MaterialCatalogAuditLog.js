const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaterialCatalogAuditLog = sequelize.define('MaterialCatalogAuditLog', {
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
    tableName: 'material_catalog_audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = MaterialCatalogAuditLog;
