import sequelize from '../config/database';
import Order from './Order';
import OrderItem from './OrderItem';
import OrderIdempotencyKey from './OrderIdempotencyKey';
import InventoryReceipt from './InventoryReceipt';
import Material from './Material';
import MaterialCatalogProfile from './MaterialCatalogProfile';
import MaterialCatalogRevision from './MaterialCatalogRevision';
import MaterialCatalogAuditLog from './MaterialCatalogAuditLog';
import ErpContract from './ErpContract';
import FormulaDefinition from './FormulaDefinition';
import FormulaRevision from './FormulaRevision';
import FormulaAuditLog from './FormulaAuditLog';
import MappingProfile from './MappingProfile';
import MappingRevision from './MappingRevision';
import MappingAuditLog from './MappingAuditLog';
import MappingUnmatchedEvent from './MappingUnmatchedEvent';
import { runMigrations } from '../db/migrate';
import type { ModelInstance } from '../shared/types';
import type {
    MaterialAttributes, MaterialCreationAttributes,
    OrderAttributes, OrderCreationAttributes,
    OrderItemAttributes, OrderItemCreationAttributes,
    InventoryReceiptAttributes, InventoryReceiptCreationAttributes,
    MappingProfileAttributes, MappingProfileCreationAttributes,
    MappingRevisionAttributes, MappingRevisionCreationAttributes,
    MappingAuditLogAttributes, MappingAuditLogCreationAttributes,
    MappingUnmatchedEventAttributes, MappingUnmatchedEventCreationAttributes,
    MaterialCatalogProfileAttributes, MaterialCatalogProfileCreationAttributes,
    MaterialCatalogRevisionAttributes, MaterialCatalogRevisionCreationAttributes,
    MaterialCatalogAuditLogAttributes, MaterialCatalogAuditLogCreationAttributes,
} from './types';

export type MaterialInstance = ModelInstance<MaterialAttributes, MaterialCreationAttributes>;
export type OrderInstance = ModelInstance<OrderAttributes, OrderCreationAttributes>;
export type OrderItemInstance = ModelInstance<OrderItemAttributes, OrderItemCreationAttributes>;
export type InventoryReceiptInstance = ModelInstance<InventoryReceiptAttributes, InventoryReceiptCreationAttributes>;
export type MappingProfileInstance = ModelInstance<MappingProfileAttributes, MappingProfileCreationAttributes>;
export type MappingRevisionInstance = ModelInstance<MappingRevisionAttributes, MappingRevisionCreationAttributes>;
export type MappingAuditLogInstance = ModelInstance<MappingAuditLogAttributes, MappingAuditLogCreationAttributes>;
export type MappingUnmatchedEventInstance = ModelInstance<MappingUnmatchedEventAttributes, MappingUnmatchedEventCreationAttributes>;
export type MaterialCatalogProfileInstance = ModelInstance<MaterialCatalogProfileAttributes, MaterialCatalogProfileCreationAttributes>;
export type MaterialCatalogRevisionInstance = ModelInstance<MaterialCatalogRevisionAttributes, MaterialCatalogRevisionCreationAttributes>;
export type MaterialCatalogAuditLogInstance = ModelInstance<MaterialCatalogAuditLogAttributes, MaterialCatalogAuditLogCreationAttributes>;

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


export {
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

