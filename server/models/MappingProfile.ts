import type { ModelDefined } from 'sequelize';
import type {
    MappingProfileAttributes,
    MappingProfileCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { PROFILE_CODE_LIST, PROFILE_STATUSES } from '../services/mappings/mapping.constants';

const MappingProfile: ModelDefined<MappingProfileAttributes, MappingProfileCreationAttributes> = sequelize.define('MappingProfile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    profile_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isIn: [PROFILE_CODE_LIST]
        }
    },
    display_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: PROFILE_STATUSES.ACTIVE
    },
    active_revision: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'mapping_profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default MappingProfile;
