const { DataTypes } = require('sequelize');

const INVENTORY_RECEIPT_COLUMNS = {
    direction: { type: DataTypes.STRING, allowNull: false, defaultValue: 'in' },
    source_receipt_id: { type: DataTypes.INTEGER, allowNull: true },
    reverse_reason: { type: DataTypes.STRING, allowNull: true },
};

module.exports = {
    id: '20260313-003-add-inventory-receipt-columns',
    name: 'add inventory receipt additive columns',
    async up({ queryInterface }) {
        const existing = await queryInterface.describeTable('inventory_receipts');
        for (const [column, definition] of Object.entries(INVENTORY_RECEIPT_COLUMNS)) {
            if (existing[column]) continue;
            await queryInterface.addColumn('inventory_receipts', column, definition);
        }
    },
};
