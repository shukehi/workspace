import type { ModelDefined } from 'sequelize';

import type {
    OrderItemAttributes,
    OrderItemCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const OrderItem: ModelDefined<OrderItemAttributes, OrderItemCreationAttributes> = sequelize.define('OrderItem', {
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
    resolved_material_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    external_material_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    material_resolve_source: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transaction_unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stock_unit: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unit_conversion_factor: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    stock_quantity: {
        type: DataTypes.FLOAT,
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

export default OrderItem;
