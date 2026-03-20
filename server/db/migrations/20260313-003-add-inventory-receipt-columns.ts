import { DataTypes, QueryInterface, ModelAttributeColumnOptions } from 'sequelize';

const INVENTORY_RECEIPT_COLUMNS: Record<string, ModelAttributeColumnOptions> = {
    direction: { type: DataTypes.STRING, allowNull: false, defaultValue: 'in' },
    source_receipt_id: { type: DataTypes.INTEGER, allowNull: true },
    reverse_reason: { type: DataTypes.STRING, allowNull: true },
};

export const id = '20260313-003-add-inventory-receipt-columns';
export const name = 'add inventory receipt additive columns';

export async function up({ queryInterface }: { queryInterface: QueryInterface }): Promise<void> {
    const existing = await queryInterface.describeTable('inventory_receipts');
    for (const [column, definition] of Object.entries(INVENTORY_RECEIPT_COLUMNS)) {
        if (existing[column]) continue;
        await queryInterface.addColumn('inventory_receipts', column, definition);
    }
}
