import type { ModelDefined } from 'sequelize';

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface ErpContractAttributes {
    id: number;
    contract_code: string;
    customer_name?: string | null;
    order_date?: string | null;
    advance_date?: string | null;
    total_count_raw?: string | null;
    total_amount?: number | null;
    payload_hash: string;
    last_fetched_at: Date;
    raw_json: object;
    created_at?: Date;
    updated_at?: Date;
}

export interface ErpContractCreationAttributes {
    id?: number;
    contract_code: string;
    customer_name?: string | null;
    order_date?: string | null;
    advance_date?: string | null;
    total_count_raw?: string | null;
    total_amount?: number | null;
    payload_hash: string;
    last_fetched_at: Date | string;
    raw_json: object;
}

const ErpContract: ModelDefined<ErpContractAttributes, ErpContractCreationAttributes> = sequelize.define('ErpContract', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    contract_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    customer_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    order_date: {
        type: DataTypes.STRING,
        allowNull: true
    },
    advance_date: {
        type: DataTypes.STRING,
        allowNull: true
    },
    total_count_raw: {
        type: DataTypes.STRING,
        allowNull: true
    },
    total_amount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    payload_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_fetched_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    raw_json: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {
    tableName: 'erp_contracts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['contract_code'] },
        { fields: ['last_fetched_at'] }
    ]
});

export default ErpContract;
