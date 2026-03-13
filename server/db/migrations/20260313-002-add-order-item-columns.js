const { DataTypes } = require('sequelize');

const ORDER_ITEM_COLUMNS = {
    material_id: { type: DataTypes.STRING, allowNull: true },
    supplier: { type: DataTypes.STRING, allowNull: true },
    internal_name: { type: DataTypes.STRING, allowNull: true },
    external_name: { type: DataTypes.STRING, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: true },
    spec: { type: DataTypes.STRING, allowNull: true },
    mb: { type: DataTypes.STRING, allowNull: true },
    eccentricity: { type: DataTypes.STRING, allowNull: true },
    ordered_quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    received_quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    quantity_left: { type: DataTypes.FLOAT, allowNull: true },
    quantity_right: { type: DataTypes.FLOAT, allowNull: true },
};

module.exports = {
    id: '20260313-002-add-order-item-columns',
    name: 'add order item additive columns',
    async up({ queryInterface }) {
        const existing = await queryInterface.describeTable('order_items');
        for (const [column, definition] of Object.entries(ORDER_ITEM_COLUMNS)) {
            if (existing[column]) continue;
            await queryInterface.addColumn('order_items', column, definition);
        }
    },
};
