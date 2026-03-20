import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type {
    InventoryLocationBalanceAttributes,
    InventoryLocationBalanceCreationAttributes,
} from './types';

const InventoryLocationBalance: ModelDefined<InventoryLocationBalanceAttributes, InventoryLocationBalanceCreationAttributes> = sequelize.define('InventoryLocationBalance', {
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
    quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'inventory_location_balances',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['material_id', 'warehouse_id', 'location_id'],
        },
    ],
});

export default InventoryLocationBalance;
