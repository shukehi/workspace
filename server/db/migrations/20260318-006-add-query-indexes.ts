import { Sequelize } from 'sequelize';

export const id = '20260318-006-add-query-indexes';
export const name = 'add indexes on orders, order_items, inventory_receipts for common query fields';

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
    // orders — 高频筛选字段
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_source_contract_code ON orders(source_contract_code)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);

    // order_items — 关联查询
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_order_items_material_id ON order_items(material_id)`);

    // inventory_receipts — 关联查询
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_inventory_receipts_order_id ON inventory_receipts(order_id)`);
}

export async function down({ sequelize }: { sequelize: Sequelize }): Promise<void> {
    await sequelize.query(`DROP INDEX IF EXISTS idx_orders_status`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_orders_category`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_orders_supplier`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_orders_source_contract_code`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_orders_created_at`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_order_items_order_id`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_order_items_material_id`);
    await sequelize.query(`DROP INDEX IF EXISTS idx_inventory_receipts_order_id`);
}
