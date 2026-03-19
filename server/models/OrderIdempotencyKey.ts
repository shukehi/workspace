import type { ModelDefined } from 'sequelize';

import type {
    OrderIdempotencyKeyAttributes,
    OrderIdempotencyKeyCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const OrderIdempotencyKey: ModelDefined<OrderIdempotencyKeyAttributes, OrderIdempotencyKeyCreationAttributes> = sequelize.define('OrderIdempotencyKey', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    scope: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'auto_po'
    },
    source_contract_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dedupe_key: {
        type: DataTypes.STRING,
        allowNull: false
    },
    order_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'order_idempotency_keys',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default OrderIdempotencyKey;
