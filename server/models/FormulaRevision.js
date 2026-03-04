const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FormulaRevision = sequelize.define('FormulaRevision', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    formula_id: {
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
        allowNull: false
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
    tableName: 'formula_revisions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['formula_id', 'revision']
        }
    ]
});

module.exports = FormulaRevision;
