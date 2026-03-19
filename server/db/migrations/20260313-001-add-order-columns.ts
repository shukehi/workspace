import { DataTypes, QueryInterface, ModelAttributeColumnOptions } from 'sequelize';

const ORDER_COLUMNS: Record<string, ModelAttributeColumnOptions> = {
    remark: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    source_contract_code: { type: DataTypes.STRING, allowNull: true },
    dedupe_key: { type: DataTypes.STRING, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: true },
    arrived_at: { type: DataTypes.DATE, allowNull: true },
    arrived_by: { type: DataTypes.STRING, allowNull: true },
    arrived_remark: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    stocked_in_at: { type: DataTypes.DATE, allowNull: true },
    stocked_in_by: { type: DataTypes.STRING, allowNull: true },
    stocked_in_remark: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
};

export const id = '20260313-001-add-order-columns';
export const name = 'add order additive columns';

export async function up({ queryInterface }: { queryInterface: QueryInterface }): Promise<void> {
    const existing = await queryInterface.describeTable('orders');
    for (const [column, definition] of Object.entries(ORDER_COLUMNS)) {
        if (existing[column]) continue;
        await queryInterface.addColumn('orders', column, definition);
    }
}
