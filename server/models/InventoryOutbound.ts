import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type { InventoryOutboundAttributes, InventoryOutboundCreationAttributes } from './types';

const InventoryOutbound: ModelDefined<InventoryOutboundAttributes, InventoryOutboundCreationAttributes> = sequelize.define('InventoryOutbound', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    outbound_no: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    direction: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'out',
    },
    source_outbound_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    location_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    operator: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    remark: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'posted',
    },
    outbound_date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'inventory_outbounds',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['source_outbound_id', 'direction'],
        },
    ],
});

export default InventoryOutbound;
