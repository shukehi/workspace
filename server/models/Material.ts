import type { ModelDefined } from 'sequelize';

import type {
    MaterialAttributes,
    MaterialCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const Material: ModelDefined<MaterialAttributes, MaterialCreationAttributes> = sequelize.define('Material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    model: {
        type: DataTypes.STRING,
        allowNull: true
    },
    supplier: {
        type: DataTypes.STRING,
        allowNull: true
    },
    unit: {
        type: DataTypes.STRING,
        defaultValue: 'PCS'
    },
    price: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    package_spec: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stock_quantity: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    min_stock: {
        type: DataTypes.FLOAT,
        defaultValue: 100
    },
    aliases: {
        type: DataTypes.JSON,
        defaultValue: []
    }
}, {
    tableName: 'materials',
    timestamps: true
});

export default Material;
