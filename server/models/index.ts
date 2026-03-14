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
const { runMigrations } = require('../db/migrate');

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasMany(OrderIdempotencyKey, { foreignKey: 'order_id', as: 'idempotencyKeys', onDelete: 'CASCADE' });
OrderIdempotencyKey.belongsTo(Order, { foreignKey: 'order_id' });
Order.hasMany(InventoryReceipt, { foreignKey: 'order_id', as: 'inventoryReceipts', onDelete: 'CASCADE' });
InventoryReceipt.belongsTo(Order, { foreignKey: 'order_id' });
InventoryReceipt.belongsTo(InventoryReceipt, { foreignKey: 'source_receipt_id', as: 'sourceReceipt' });
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

const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('📦 Database connection establishment... OK');

        await sequelize.sync();
        await runMigrations(sequelize);
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
