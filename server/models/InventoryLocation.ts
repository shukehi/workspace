import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type { InventoryLocationAttributes, InventoryLocationCreationAttributes } from './types';

const InventoryLocation: ModelDefined<InventoryLocationAttributes, InventoryLocationCreationAttributes> = sequelize.define('InventoryLocation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'inventory_locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['warehouse_id', 'code'],
        },
    ],
});

export default InventoryLocation;
