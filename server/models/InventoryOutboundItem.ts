import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type {
    InventoryOutboundItemAttributes,
    InventoryOutboundItemCreationAttributes,
} from './types';

const InventoryOutboundItem: ModelDefined<InventoryOutboundItemAttributes, InventoryOutboundItemCreationAttributes> = sequelize.define('InventoryOutboundItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    outbound_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    item_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    unit: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    quantity: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'inventory_outbound_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default InventoryOutboundItem;
