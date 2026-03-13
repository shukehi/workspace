const { DataTypes } = require('sequelize');

const MATERIAL_COLUMNS = {
    package_spec: { type: DataTypes.STRING, allowNull: true },
    stock_quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    min_stock: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 100 },
    aliases: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
};

module.exports = {
    id: '20260313-004-add-material-columns',
    name: 'add material additive columns',
    async up({ queryInterface }) {
        const existing = await queryInterface.describeTable('materials');
        for (const [column, definition] of Object.entries(MATERIAL_COLUMNS)) {
            if (existing[column]) continue;
            await queryInterface.addColumn('materials', column, definition);
        }
    },
};
