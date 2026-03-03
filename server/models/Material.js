const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Material = sequelize.define('Material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    model: {
        type: DataTypes.STRING,
        allowNull: true
    },
    supplier: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING,
        defaultValue: 'PCS'
    },
    price: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    package_spec: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stock_quantity: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    min_stock: {
        type: DataTypes.FLOAT,
        defaultValue: 100
    },
    aliases: {
        type: DataTypes.JSON, // Store list of strings ["alias1", "alias2"]
        defaultValue: []
    }
}, {
    tableName: 'materials',
    timestamps: true
});

module.exports = Material;
