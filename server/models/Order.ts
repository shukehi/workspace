import type { ModelDefined } from 'sequelize';

import type {
    OrderAttributes,
    OrderCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const Order: ModelDefined<OrderAttributes, OrderCreationAttributes> = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    order_no: {
        type: DataTypes.STRING,
        allowNull: false
    },
    supplier: {
        type: DataTypes.STRING,
        allowNull: true
    },
    source_contract_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dedupe_key: {
        type: DataTypes.STRING,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'draft'
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    metadata: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    delivery_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    arrived_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    arrived_by: {
        type: DataTypes.STRING,
        allowNull: true
    },
    arrived_remark: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    stocked_in_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    stocked_in_by: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stocked_in_remark: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    }
}, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default Order;
