import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type { InventoryMovementAttributes, InventoryMovementCreationAttributes } from './types';

const InventoryMovement: ModelDefined<InventoryMovementAttributes, InventoryMovementCreationAttributes> = sequelize.define('InventoryMovement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    source_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    source_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    source_line_key: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    delta_quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    balance_after: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    stock_after: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    operator: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    occurred_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    metadata_json: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '{}',
    },
}, {
    tableName: 'inventory_movements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['source_type', 'source_id', 'source_line_key'],
        },
        {
            fields: ['material_id', 'warehouse_id', 'location_id', 'occurred_at'],
        },
    ],
});

export default InventoryMovement;
