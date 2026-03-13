const { DataTypes } = require('sequelize');

const IDEMPOTENCY_COLUMNS = {
    scope: { type: DataTypes.STRING, allowNull: false, defaultValue: 'auto_po' },
    source_contract_code: { type: DataTypes.STRING, allowNull: false },
    dedupe_key: { type: DataTypes.STRING, allowNull: false },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
};

module.exports = {
    id: '20260313-005-add-order-idempotency-columns-and-index',
    name: 'add order idempotency additive columns and active index',
    async up({ sequelize, queryInterface }) {
        const existing = await queryInterface.describeTable('order_idempotency_keys');
        for (const [column, definition] of Object.entries(IDEMPOTENCY_COLUMNS)) {
            if (existing[column]) continue;
            await queryInterface.addColumn('order_idempotency_keys', column, definition);
        }

        await sequelize.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_order_idempotency_active
            ON order_idempotency_keys(scope, dedupe_key)
            WHERE active = 1
        `);
    },
};
