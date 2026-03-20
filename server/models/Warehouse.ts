import type { ModelDefined } from 'sequelize';
import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import type { WarehouseAttributes, WarehouseCreationAttributes } from './types';

const Warehouse: ModelDefined<WarehouseAttributes, WarehouseCreationAttributes> = sequelize.define('Warehouse', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
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
}, {
    tableName: 'warehouses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default Warehouse;
