import { DataTypes, type QueryInterface, type Sequelize } from 'sequelize';

export const id = '20260320-007-add-inventory-location-and-outbound';
export const name = 'add warehouses, locations, balances, outbound tables and receipt location columns';

const DEFAULT_WAREHOUSE_CODE = 'DEFAULT';
const DEFAULT_WAREHOUSE_NAME = '默认仓';
const DEFAULT_LOCATION_CODE = 'UNASSIGNED';
const DEFAULT_LOCATION_NAME = '待分配库位';

type MigrationContext = {
    sequelize: Sequelize;
    queryInterface: QueryInterface;
};

async function ensureWarehouseTable(sequelize: Sequelize) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS warehouses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(255) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            status VARCHAR(64) NOT NULL DEFAULT 'active',
            remark TEXT NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function ensureLocationTable(sequelize: Sequelize) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS inventory_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            warehouse_id INTEGER NOT NULL,
            status VARCHAR(64) NOT NULL DEFAULT 'active',
            remark TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        )
    `);
    await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_locations_warehouse_code
        ON inventory_locations(warehouse_id, code)
    `);
}

async function ensureBalanceTable(sequelize: Sequelize) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS inventory_location_balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            material_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            location_id INTEGER NOT NULL,
            quantity FLOAT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
            FOREIGN KEY (location_id) REFERENCES inventory_locations(id)
        )
    `);
    await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_location_balances_unique
        ON inventory_location_balances(material_id, warehouse_id, location_id)
    `);
}

async function ensureOutboundTables(sequelize: Sequelize) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS inventory_outbounds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            outbound_no VARCHAR(255) NOT NULL UNIQUE,
            direction VARCHAR(64) NOT NULL DEFAULT 'out',
            source_outbound_id INTEGER,
            warehouse_id INTEGER NOT NULL,
            location_id INTEGER NOT NULL,
            operator VARCHAR(255),
            reason VARCHAR(255) NOT NULL,
            remark TEXT NOT NULL DEFAULT '',
            status VARCHAR(64) NOT NULL DEFAULT 'posted',
            outbound_date DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_outbound_id) REFERENCES inventory_outbounds(id),
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
            FOREIGN KEY (location_id) REFERENCES inventory_locations(id)
        )
    `);
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS inventory_outbound_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            outbound_id INTEGER NOT NULL,
            material_id INTEGER NOT NULL,
            item_name VARCHAR(255) NOT NULL,
            unit VARCHAR(255),
            quantity FLOAT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (outbound_id) REFERENCES inventory_outbounds(id),
            FOREIGN KEY (material_id) REFERENCES materials(id)
        )
    `);
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_outbounds_source_outbound_id
        ON inventory_outbounds(source_outbound_id)
    `);
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_outbound_items_outbound_id
        ON inventory_outbound_items(outbound_id)
    `);
}

async function ensureDefaultWarehouse(sequelize: Sequelize): Promise<number> {
    await sequelize.query(
        `
            INSERT INTO warehouses (code, name, status, remark, created_at, updated_at)
            SELECT ?, ?, 'active', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE code = ?)
        `,
        { replacements: [DEFAULT_WAREHOUSE_CODE, DEFAULT_WAREHOUSE_NAME, DEFAULT_WAREHOUSE_CODE] }
    );

    const [rows] = await sequelize.query(
        'SELECT id FROM warehouses WHERE code = ? LIMIT 1',
        { replacements: [DEFAULT_WAREHOUSE_CODE] }
    );
    return Number((rows as Array<{ id: number }>)[0]?.id || 0);
}

async function ensureDefaultLocation(sequelize: Sequelize, warehouseId: number): Promise<number> {
    await sequelize.query(
        `
            INSERT INTO inventory_locations (code, name, warehouse_id, status, remark, sort_order, created_at, updated_at)
            SELECT ?, ?, ?, 'active', '', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
                SELECT 1 FROM inventory_locations WHERE warehouse_id = ? AND code = ?
            )
        `,
        { replacements: [DEFAULT_LOCATION_CODE, DEFAULT_LOCATION_NAME, warehouseId, warehouseId, DEFAULT_LOCATION_CODE] }
    );

    const [rows] = await sequelize.query(
        'SELECT id FROM inventory_locations WHERE warehouse_id = ? AND code = ? LIMIT 1',
        { replacements: [warehouseId, DEFAULT_LOCATION_CODE] }
    );
    return Number((rows as Array<{ id: number }>)[0]?.id || 0);
}

async function ensureReceiptColumns(
    queryInterface: QueryInterface,
    sequelize: Sequelize,
    warehouseId: number,
    locationId: number,
) {
    const existing = await queryInterface.describeTable('inventory_receipts');

    if (!existing.warehouse_id) {
        await queryInterface.addColumn('inventory_receipts', 'warehouse_id', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: warehouseId,
        });
    }
    if (!existing.location_id) {
        await queryInterface.addColumn('inventory_receipts', 'location_id', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: locationId,
        });
    }

    await sequelize.query(
        'UPDATE inventory_receipts SET warehouse_id = COALESCE(warehouse_id, ?), location_id = COALESCE(location_id, ?) WHERE warehouse_id IS NULL OR location_id IS NULL',
        { replacements: [warehouseId, locationId] }
    );

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_receipts_location_id
        ON inventory_receipts(location_id)
    `);
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_receipts_warehouse_id
        ON inventory_receipts(warehouse_id)
    `);
}

async function backfillLegacyBalances(sequelize: Sequelize, warehouseId: number, locationId: number) {
    await sequelize.query(
        `
            INSERT INTO inventory_location_balances (material_id, warehouse_id, location_id, quantity, created_at, updated_at)
            SELECT m.id, ?, ?, COALESCE(m.stock_quantity, 0), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM materials m
            WHERE COALESCE(m.stock_quantity, 0) > 0
              AND NOT EXISTS (
                  SELECT 1
                  FROM inventory_location_balances b
                  WHERE b.material_id = m.id
                    AND b.warehouse_id = ?
                    AND b.location_id = ?
              )
        `,
        { replacements: [warehouseId, locationId, warehouseId, locationId] }
    );
}

export async function up({ sequelize, queryInterface }: MigrationContext) {
    await ensureWarehouseTable(sequelize);
    await ensureLocationTable(sequelize);
    await ensureBalanceTable(sequelize);
    await ensureOutboundTables(sequelize);

    const warehouseId = await ensureDefaultWarehouse(sequelize);
    const locationId = await ensureDefaultLocation(sequelize, warehouseId);

    await ensureReceiptColumns(queryInterface, sequelize, warehouseId, locationId);
    await backfillLegacyBalances(sequelize, warehouseId, locationId);
}
