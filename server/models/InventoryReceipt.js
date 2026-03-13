const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryReceipt = sequelize.define('InventoryReceipt', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    order_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    order_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    material_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    item_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    supplier: {
        type: DataTypes.STRING,
        allowNull: true
    },
    quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    receipt_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    operator: {
        type: DataTypes.STRING,
        allowNull: true
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    }
}, {
    tableName: 'inventory_receipts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = InventoryReceipt;
