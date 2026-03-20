import { DataTypes, type QueryInterface, type Sequelize } from 'sequelize';

export const id = '20260320-008-add-inventory-reversal-guards';
export const name = 'add outbound reversal uniqueness guard and receipt reversal lookup index';

type MigrationContext = {
    sequelize: Sequelize;
    queryInterface: QueryInterface;
};

export async function up({ sequelize }: MigrationContext) {
    const receiptColumns = await sequelize.getQueryInterface().describeTable('inventory_receipts');
    if (!receiptColumns.reverse_version) {
        await sequelize.getQueryInterface().addColumn('inventory_receipts', 'reverse_version', {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
    }

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_inventory_receipts_source_direction
        ON inventory_receipts(source_receipt_id, direction)
    `);

    await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_outbounds_source_direction_unique
        ON inventory_outbounds(source_outbound_id, direction)
        WHERE source_outbound_id IS NOT NULL
    `);
}
