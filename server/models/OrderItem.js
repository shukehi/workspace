const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    material_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    supplier: {
        type: DataTypes.STRING,
        allowNull: true
    },
    internal_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    external_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: DataTypes.STRING,
        allowNull: true
    },
    spec: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mb: {
        type: DataTypes.STRING,
        allowNull: true
    },
    eccentricity: {
        type: DataTypes.STRING,
        allowNull: true
    },
    model: {
        type: DataTypes.STRING,
        allowNull: true
    },
    quantity: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    ordered_quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    received_quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    quantity_left: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    quantity_right: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    price: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'order_items',
    timestamps: false
});

module.exports = OrderItem;
