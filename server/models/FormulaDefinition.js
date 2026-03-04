const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FormulaDefinition = sequelize.define('FormulaDefinition', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    formula_key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Default'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'draft'
    },
    active_revision: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'formula_definitions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = FormulaDefinition;
