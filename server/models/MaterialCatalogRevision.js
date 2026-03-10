const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MaterialCatalogRevision = sequelize.define('MaterialCatalogRevision', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    profile_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    revision: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'draft'
    },
    payload_json: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '{}'
    },
    change_note: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_by: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'system-admin'
    }
}, {
    tableName: 'material_catalog_revisions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['profile_id', 'revision']
        },
        {
            fields: ['profile_id', 'state']
        }
    ]
});

module.exports = MaterialCatalogRevision;
