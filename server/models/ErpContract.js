const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ErpContract = sequelize.define('ErpContract', {
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

module.exports = ErpContract;

