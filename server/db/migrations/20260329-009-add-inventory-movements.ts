import type { Sequelize } from 'sequelize';

export const id = '20260329-009-add-inventory-movements';
export const name = 'add inventory movements ledger table';

type MigrationContext = {
    sequelize: Sequelize;
};

export async function up({ sequelize }: MigrationContext) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            material_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            location_id INTEGER NOT NULL,
            source_type VARCHAR(64) NOT NULL,
            source_id VARCHAR(255) NOT NULL,
            source_line_key VARCHAR(255) NOT NULL,
            delta_quantity FLOAT NOT NULL,
            balance_after FLOAT NOT NULL,
            stock_after FLOAT NOT NULL,
            reason VARCHAR(255) NOT NULL,
            operator VARCHAR(255),
            remark TEXT NOT NULL DEFAULT '',
            occurred_at DATETIME NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
            FOREIGN KEY (location_id) REFERENCES inventory_locations(id)
        )
    `);

    await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_movements_source_unique
        ON inventory_movements(source_type, source_id, source_line_key)
    `);

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_movements_material_location
        ON inventory_movements(material_id, warehouse_id, location_id, occurred_at)
    `);
}
