const sequelize = require('../config/database');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Material = require('./Material');
const ErpContract = require('./ErpContract');
const FormulaDefinition = require('./FormulaDefinition');
const FormulaRevision = require('./FormulaRevision');
const FormulaAuditLog = require('./FormulaAuditLog');

// Define Relationships
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
FormulaDefinition.hasMany(FormulaRevision, { foreignKey: 'formula_id', as: 'revisions', onDelete: 'CASCADE' });
FormulaRevision.belongsTo(FormulaDefinition, { foreignKey: 'formula_id' });
FormulaDefinition.hasMany(FormulaAuditLog, { foreignKey: 'formula_id', as: 'auditLogs', onDelete: 'CASCADE' });
FormulaAuditLog.belongsTo(FormulaDefinition, { foreignKey: 'formula_id' });

async function ensureOrderItemColumns() {
    const queryInterface = sequelize.getQueryInterface();
    const table = 'order_items';
    const existing = await queryInterface.describeTable(table);

    const targetColumns = [
        'supplier',
        'internal_name',
        'external_name',
        'type',
        'spec',
        'mb',
        'eccentricity',
        'quantity_left',
        'quantity_right'
    ];

    for (const col of targetColumns) {
        if (existing[col]) continue;
        const attr = OrderItem.rawAttributes[col];
        if (!attr) continue;
        await queryInterface.addColumn(table, col, {
            type: attr.type,
            allowNull: attr.allowNull,
            defaultValue: attr.defaultValue
        });
        console.log(`✅ Added column ${table}.${col}`);
    }
}

async function ensureOrderColumns() {
    const queryInterface = sequelize.getQueryInterface();
    const table = 'orders';
    const existing = await queryInterface.describeTable(table);

    const targetColumns = ['remark'];

    for (const col of targetColumns) {
        if (existing[col]) continue;
        const attr = Order.rawAttributes[col];
        if (!attr) continue;
        await queryInterface.addColumn(table, col, {
            type: attr.type,
            allowNull: attr.allowNull,
            defaultValue: attr.defaultValue
        });
        console.log(`✅ Added column ${table}.${col}`);
    }
}

// Function to sync database
const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('📦 Database connection establishment... OK');

        // Safe sync strategy for SQLite:
        // 1) create missing tables
        // 2) apply additive column migrations manually (no table rebuild)
        await sequelize.sync();
        await ensureOrderColumns();
        await ensureOrderItemColumns();
        console.log('✅ Database synchronized');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        throw error;
    }
};

module.exports = {
    sequelize,
    initDB,
    Order,
    OrderItem,
    Material,
    ErpContract,
    FormulaDefinition,
    FormulaRevision,
    FormulaAuditLog
};
