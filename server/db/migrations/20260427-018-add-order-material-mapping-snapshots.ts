import { DataTypes, QueryInterface, ModelAttributeColumnOptions } from 'sequelize';

const ORDER_ITEM_COLUMNS: Record<string, ModelAttributeColumnOptions> = {
  resolved_material_id: { type: DataTypes.INTEGER, allowNull: true },
  external_material_code: { type: DataTypes.STRING, allowNull: true },
  material_resolve_source: { type: DataTypes.STRING, allowNull: true },
  transaction_unit: { type: DataTypes.STRING, allowNull: true },
  stock_unit: { type: DataTypes.STRING, allowNull: true },
  unit_conversion_factor: { type: DataTypes.FLOAT, allowNull: true },
  stock_quantity: { type: DataTypes.FLOAT, allowNull: true },
};

const RECEIPT_COLUMNS: Record<string, ModelAttributeColumnOptions> = {
  material_mapping_snapshot_json: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' },
};

export const id = '20260427-018-add-order-material-mapping-snapshots';
export const name = 'add order material mapping snapshot columns';

async function addMissingColumns(
  queryInterface: QueryInterface,
  tableName: string,
  columns: Record<string, ModelAttributeColumnOptions>,
): Promise<void> {
  const existing = await queryInterface.describeTable(tableName);
  for (const [column, definition] of Object.entries(columns)) {
    if (existing[column]) continue;
    await queryInterface.addColumn(tableName, column, definition);
  }
}

export async function up({ queryInterface }: { queryInterface: QueryInterface }): Promise<void> {
  await addMissingColumns(queryInterface, 'order_items', ORDER_ITEM_COLUMNS);
  await addMissingColumns(queryInterface, 'inventory_receipts', RECEIPT_COLUMNS);
}
