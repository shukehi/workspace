import sequelize from '../config/database';
import Order from './Order';
import OrderItem from './OrderItem';
import OrderIdempotencyKey from './OrderIdempotencyKey';
import InventoryReceipt from './InventoryReceipt';
import Warehouse from './Warehouse';
import InventoryLocation from './InventoryLocation';
import InventoryLocationBalance from './InventoryLocationBalance';
import InventoryMovement from './InventoryMovement';
import InventoryOutbound from './InventoryOutbound';
import InventoryOutboundItem from './InventoryOutboundItem';
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
    OrderIdempotencyKeyAttributes, OrderIdempotencyKeyCreationAttributes,
    InventoryReceiptAttributes, InventoryReceiptCreationAttributes,
    WarehouseAttributes, WarehouseCreationAttributes,
    InventoryLocationAttributes, InventoryLocationCreationAttributes,
    InventoryLocationBalanceAttributes, InventoryLocationBalanceCreationAttributes,
    InventoryMovementAttributes, InventoryMovementCreationAttributes,
    InventoryOutboundAttributes, InventoryOutboundCreationAttributes,
    InventoryOutboundItemAttributes, InventoryOutboundItemCreationAttributes,
    FormulaDefinitionAttributes, FormulaDefinitionCreationAttributes,
    FormulaRevisionAttributes, FormulaRevisionCreationAttributes,
    FormulaAuditLogAttributes, FormulaAuditLogCreationAttributes,
    MappingProfileAttributes, MappingProfileCreationAttributes,
    MappingRevisionAttributes, MappingRevisionCreationAttributes,
    MappingAuditLogAttributes, MappingAuditLogCreationAttributes,
    MappingUnmatchedEventAttributes, MappingUnmatchedEventCreationAttributes,
    MaterialCatalogProfileAttributes, MaterialCatalogProfileCreationAttributes,
    MaterialCatalogRevisionAttributes, MaterialCatalogRevisionCreationAttributes,
    MaterialCatalogAuditLogAttributes, MaterialCatalogAuditLogCreationAttributes,
} from './types';

export type MaterialInstance = ModelInstance<MaterialAttributes, MaterialCreationAttributes> & {
    locationBalances?: InventoryLocationBalanceInstance[];
    outboundItems?: InventoryOutboundItemInstance[];
};
export type OrderInstance = ModelInstance<OrderAttributes, OrderCreationAttributes> & {
    items?: OrderItemInstance[];
    idempotencyKeys?: OrderIdempotencyKeyInstance[];
    inventoryReceipts?: InventoryReceiptInstance[];
};
export type OrderItemInstance = ModelInstance<OrderItemAttributes, OrderItemCreationAttributes>;
export type OrderIdempotencyKeyInstance = ModelInstance<OrderIdempotencyKeyAttributes, OrderIdempotencyKeyCreationAttributes>;
export type InventoryReceiptInstance = ModelInstance<InventoryReceiptAttributes, InventoryReceiptCreationAttributes> & {
    order?: OrderInstance | null;
    sourceReceipt?: InventoryReceiptInstance | null;
    warehouse?: WarehouseInstance | null;
    location?: InventoryLocationInstance | null;
};
export type WarehouseInstance = ModelInstance<WarehouseAttributes, WarehouseCreationAttributes> & {
    locations?: InventoryLocationInstance[];
    locationBalances?: InventoryLocationBalanceInstance[];
    inventoryReceipts?: InventoryReceiptInstance[];
    inventoryOutbounds?: InventoryOutboundInstance[];
};
export type InventoryLocationInstance = ModelInstance<InventoryLocationAttributes, InventoryLocationCreationAttributes> & {
    warehouse?: WarehouseInstance | null;
    balances?: InventoryLocationBalanceInstance[];
    inventoryReceipts?: InventoryReceiptInstance[];
    inventoryOutbounds?: InventoryOutboundInstance[];
};
export type InventoryLocationBalanceInstance = ModelInstance<InventoryLocationBalanceAttributes, InventoryLocationBalanceCreationAttributes> & {
    material?: MaterialInstance | null;
    warehouse?: WarehouseInstance | null;
    location?: InventoryLocationInstance | null;
};
export type InventoryMovementInstance = ModelInstance<InventoryMovementAttributes, InventoryMovementCreationAttributes> & {
    material?: MaterialInstance | null;
    warehouse?: WarehouseInstance | null;
    location?: InventoryLocationInstance | null;
};
export type InventoryOutboundInstance = ModelInstance<InventoryOutboundAttributes, InventoryOutboundCreationAttributes> & {
    sourceOutbound?: InventoryOutboundInstance | null;
    warehouse?: WarehouseInstance | null;
    location?: InventoryLocationInstance | null;
    items?: InventoryOutboundItemInstance[];
};
export type InventoryOutboundItemInstance = ModelInstance<InventoryOutboundItemAttributes, InventoryOutboundItemCreationAttributes> & {
    outbound?: InventoryOutboundInstance | null;
    material?: MaterialInstance | null;
};
export type FormulaDefinitionInstance = ModelInstance<FormulaDefinitionAttributes, FormulaDefinitionCreationAttributes>;
export type FormulaRevisionInstance = ModelInstance<FormulaRevisionAttributes, FormulaRevisionCreationAttributes>;
export type FormulaAuditLogInstance = ModelInstance<FormulaAuditLogAttributes, FormulaAuditLogCreationAttributes>;
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
Warehouse.hasMany(InventoryLocation, { foreignKey: 'warehouse_id', as: 'locations', onDelete: 'RESTRICT' });
InventoryLocation.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Material.hasMany(InventoryLocationBalance, { foreignKey: 'material_id', as: 'locationBalances', onDelete: 'CASCADE' });
InventoryLocationBalance.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
Warehouse.hasMany(InventoryLocationBalance, { foreignKey: 'warehouse_id', as: 'locationBalances', onDelete: 'CASCADE' });
InventoryLocationBalance.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
InventoryLocation.hasMany(InventoryLocationBalance, { foreignKey: 'location_id', as: 'balances', onDelete: 'CASCADE' });
InventoryLocationBalance.belongsTo(InventoryLocation, { foreignKey: 'location_id', as: 'location' });
Material.hasMany(InventoryMovement, { foreignKey: 'material_id', as: 'inventoryMovements', onDelete: 'RESTRICT' });
InventoryMovement.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
Warehouse.hasMany(InventoryMovement, { foreignKey: 'warehouse_id', as: 'inventoryMovements', onDelete: 'RESTRICT' });
InventoryMovement.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
InventoryLocation.hasMany(InventoryMovement, { foreignKey: 'location_id', as: 'inventoryMovements', onDelete: 'RESTRICT' });
InventoryMovement.belongsTo(InventoryLocation, { foreignKey: 'location_id', as: 'location' });
Warehouse.hasMany(InventoryReceipt, { foreignKey: 'warehouse_id', as: 'inventoryReceipts', onDelete: 'RESTRICT' });
InventoryReceipt.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
InventoryLocation.hasMany(InventoryReceipt, { foreignKey: 'location_id', as: 'inventoryReceipts', onDelete: 'RESTRICT' });
InventoryReceipt.belongsTo(InventoryLocation, { foreignKey: 'location_id', as: 'location' });
Warehouse.hasMany(InventoryOutbound, { foreignKey: 'warehouse_id', as: 'inventoryOutbounds', onDelete: 'RESTRICT' });
InventoryOutbound.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
InventoryLocation.hasMany(InventoryOutbound, { foreignKey: 'location_id', as: 'inventoryOutbounds', onDelete: 'RESTRICT' });
InventoryOutbound.belongsTo(InventoryLocation, { foreignKey: 'location_id', as: 'location' });
InventoryOutbound.belongsTo(InventoryOutbound, { foreignKey: 'source_outbound_id', as: 'sourceOutbound' });
InventoryOutbound.hasMany(InventoryOutboundItem, { foreignKey: 'outbound_id', as: 'items', onDelete: 'CASCADE' });
InventoryOutboundItem.belongsTo(InventoryOutbound, { foreignKey: 'outbound_id', as: 'outbound' });
Material.hasMany(InventoryOutboundItem, { foreignKey: 'material_id', as: 'outboundItems', onDelete: 'RESTRICT' });
InventoryOutboundItem.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
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
    Warehouse,
    InventoryLocation,
    InventoryLocationBalance,
    InventoryMovement,
    InventoryOutbound,
    InventoryOutboundItem,
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
