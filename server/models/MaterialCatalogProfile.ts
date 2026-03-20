import type { ModelDefined } from 'sequelize';
import type {
    MaterialCatalogProfileAttributes,
    MaterialCatalogProfileCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const MaterialCatalogProfile: ModelDefined<MaterialCatalogProfileAttributes, MaterialCatalogProfileCreationAttributes> = sequelize.define('MaterialCatalogProfile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    profile_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        defaultValue: 'materials'
    },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Materials Catalog'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active'
    },
    active_revision: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'material_catalog_profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default MaterialCatalogProfile;
