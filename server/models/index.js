const sequelize = require('../config/database');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const OrderIdempotencyKey = require('./OrderIdempotencyKey');
const InventoryReceipt = require('./InventoryReceipt');
const Material = require('./Material');
const MaterialCatalogProfile = require('./MaterialCatalogProfile');
const MaterialCatalogRevision = require('./MaterialCatalogRevision');
const MaterialCatalogAuditLog = require('./MaterialCatalogAuditLog');
const ErpContract = require('./ErpContract');
const FormulaDefinition = require('./FormulaDefinition');
const FormulaRevision = require('./FormulaRevision');
const FormulaAuditLog = require('./FormulaAuditLog');
const MappingProfile = require('./MappingProfile');
const MappingRevision = require('./MappingRevision');
const MappingAuditLog = require('./MappingAuditLog');
const MappingUnmatchedEvent = require('./MappingUnmatchedEvent');

// Define Relationships
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasMany(OrderIdempotencyKey, { foreignKey: 'order_id', as: 'idempotencyKeys', onDelete: 'CASCADE' });
OrderIdempotencyKey.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasMany(InventoryReceipt, { foreignKey: 'order_id', as: 'inventoryReceipts', onDelete: 'CASCADE' });
InventoryReceipt.belongsTo(Order, { foreignKey: 'order_id' });
FormulaDefinition.hasMany(FormulaRevision, { foreignKey: 'formula_id', as: 'revisions', onDelete: 'CASCADE' });
FormulaRevision.belongsTo(FormulaDefinition, { foreignKey: 'formula_id' });
FormulaDefinition.hasMany(FormulaAuditLog, { foreignKey: 'formula_id', as: 'auditLogs', onDelete: 'CASCADE' });
FormulaAuditLog.belongsTo(FormulaDefinition, { foreignKey: 'formula_id' });
MappingProfile.hasMany(MappingRevision, { foreignKey: 'profile_id', as: 'revisions', onDelete: 'CASCADE' });
MappingRevision.belongsTo(MappingProfile, { foreignKey: 'profile_id' });
MappingProfile.hasMany(MappingAuditLog, { foreignKey: 'profile_id', as: 'auditLogs', onDelete: 'CASCADE' });
MappingAuditLog.belongsTo(MappingProfile, { foreignKey: 'profile_id' });
MaterialCatalogProfile.hasMany(MaterialCatalogRevision, { foreignKey: 'profile_id', as: 'revisions', onDelete: 'CASCADE' });
MaterialCatalogRevision.belongsTo(MaterialCatalogProfile, { foreignKey: 'profile_id' });
MaterialCatalogProfile.hasMany(MaterialCatalogAuditLog, { foreignKey: 'profile_id', as: 'auditLogs', onDelete: 'CASCADE' });
MaterialCatalogAuditLog.belongsTo(MaterialCatalogProfile, { foreignKey: 'profile_id' });

async function ensureOrderItemColumns() {
    const queryInterface = sequelize.getQueryInterface();
    const table = 'order_items';
    const existing = await queryInterface.describeTable(table);

    const targetColumns = [
        'material_id',
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

    const targetColumns = [
        'remark',
        'source_contract_code',
        'dedupe_key',
        'arrived_at',
        'arrived_by',
        'arrived_remark',
        'stocked_in_at',
        'stocked_in_by',
        'stocked_in_remark'
    ];

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

async function ensureMaterialColumns() {
    const queryInterface = sequelize.getQueryInterface();
    const table = 'materials';
    const existing = await queryInterface.describeTable(table);

    const targetColumns = [
        'package_spec',
        'stock_quantity',
        'min_stock',
        'aliases'
    ];

    for (const col of targetColumns) {
        if (existing[col]) continue;
        const attr = Material.rawAttributes[col];
        if (!attr) continue;
        await queryInterface.addColumn(table, col, {
            type: attr.type,
            allowNull: attr.allowNull,
            defaultValue: attr.defaultValue
        });
        console.log(`✅ Added column ${table}.${col}`);
    }
}

async function ensureOrderIdempotencyIndexes() {
    const queryInterface = sequelize.getQueryInterface();
    const table = 'order_idempotency_keys';
    const existing = await queryInterface.describeTable(table);

    const targetColumns = ['scope', 'source_contract_code', 'dedupe_key', 'order_id', 'active'];
    for (const col of targetColumns) {
        if (existing[col]) continue;
        const attr = OrderIdempotencyKey.rawAttributes[col];
        if (!attr) continue;
        await queryInterface.addColumn(table, col, {
            type: attr.type,
            allowNull: attr.allowNull,
            defaultValue: attr.defaultValue
        });
        console.log(`✅ Added column ${table}.${col}`);
    }

    await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_order_idempotency_active
        ON order_idempotency_keys(scope, dedupe_key)
        WHERE active = 1
    `);
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
        await ensureMaterialColumns();
        await ensureOrderIdempotencyIndexes();
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
    OrderIdempotencyKey,
    InventoryReceipt,
    Material,
    MaterialCatalogProfile,
    MaterialCatalogRevision,
    MaterialCatalogAuditLog,
    ErpContract,
    FormulaDefinition,
    FormulaRevision,
    FormulaAuditLog,
    MappingProfile,
    MappingRevision,
    MappingAuditLog,
    MappingUnmatchedEvent
};
