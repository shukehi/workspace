import type { ModelDefined } from 'sequelize';

import type {
    InventoryReceiptAttributes,
    InventoryReceiptCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const InventoryReceipt: ModelDefined<InventoryReceiptAttributes, InventoryReceiptCreationAttributes> = sequelize.define('InventoryReceipt', {
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
    direction: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'in'
    },
    source_receipt_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    reverse_reason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    reverse_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    location_id: {
        type: DataTypes.INTEGER,
        allowNull: false
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
    },
    material_mapping_snapshot_json: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '{}'
    }
}, {
    tableName: 'inventory_receipts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default InventoryReceipt;
