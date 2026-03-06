const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const {
    REVISION_STATES,
    SCHEMA_VERSION
} = require('../services/mappings/mapping.constants');

const MappingRevision = sequelize.define('MappingRevision', {
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
        defaultValue: REVISION_STATES.DRAFT
    },
    schema_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: SCHEMA_VERSION
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
    tableName: 'mapping_revisions',
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

module.exports = MappingRevision;
