import { DataTypes, QueryInterface, ModelAttributeColumnOptions } from 'sequelize';

const MATERIAL_COLUMNS: Record<string, ModelAttributeColumnOptions> = {
    package_spec: { type: DataTypes.STRING, allowNull: true },
    stock_quantity: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    min_stock: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 100 },
    aliases: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
};

export const id = '20260313-004-add-material-columns';
export const name = 'add material additive columns';

export async function up({ queryInterface }: { queryInterface: QueryInterface }): Promise<void> {
    const existing = await queryInterface.describeTable('materials');
    for (const [column, definition] of Object.entries(MATERIAL_COLUMNS)) {
        if (existing[column]) continue;
        await queryInterface.addColumn('materials', column, definition);
    }
}
