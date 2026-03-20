import type { ModelDefined } from 'sequelize';
import type {
    MappingUnmatchedEventAttributes,
    MappingUnmatchedEventCreationAttributes,
} from './types';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { PROFILE_CODE_LIST, UNMATCHED_EVENT_STATUSES } from '../services/mappings/mapping.constants';

const MappingUnmatchedEvent: ModelDefined<MappingUnmatchedEventAttributes, MappingUnmatchedEventCreationAttributes> = sequelize.define('MappingUnmatchedEvent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    profile_code: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [PROFILE_CODE_LIST]
        }
    },
    raw_value: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    sample_json: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    hit_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    first_seen_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    last_seen_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: UNMATCHED_EVENT_STATUSES.OPEN
    }
}, {
    tableName: 'mapping_unmatched_events',
    timestamps: false,
    indexes: [
        {
            fields: ['profile_code', 'status']
        }
    ]
});

export default MappingUnmatchedEvent;
