import type { Sequelize } from 'sequelize';

export const id = '20260426-017-add-material-mapping-tables';
export const name = 'add material mapping tables';

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS material_supplier_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      supplier_master_id INTEGER,
      supplier_code VARCHAR(255) NOT NULL,
      normalized_supplier_code VARCHAR(255) NOT NULL,
      supplier_name_snapshot VARCHAR(255),
      supplier_model VARCHAR(255),
      purchase_unit VARCHAR(64),
      stock_unit VARCHAR(64),
      conversion_factor REAL NOT NULL DEFAULT 1,
      price REAL,
      currency VARCHAR(16),
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      remark TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (supplier_master_id) REFERENCES supplier_masters(id)
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS material_code_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      mapping_type VARCHAR(64) NOT NULL,
      party_type VARCHAR(64),
      party_id INTEGER,
      external_code VARCHAR(255) NOT NULL,
      normalized_code VARCHAR(255) NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 100,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS material_uom_conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      from_unit VARCHAR(64) NOT NULL,
      to_unit VARCHAR(64) NOT NULL,
      factor REAL NOT NULL DEFAULT 1,
      is_purchase_default INTEGER NOT NULL DEFAULT 0,
      is_sales_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_supplier_mappings_material ON material_supplier_mappings(material_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_supplier_mappings_supplier ON material_supplier_mappings(supplier_master_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_supplier_mappings_lookup ON material_supplier_mappings(supplier_master_id, normalized_supplier_code, is_active)`);
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_material_supplier_mappings_active_supplier_code
    ON material_supplier_mappings(supplier_master_id, normalized_supplier_code)
    WHERE is_active = 1 AND supplier_master_id IS NOT NULL AND normalized_supplier_code <> ''
  `);

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_code_mappings_material ON material_code_mappings(material_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_code_mappings_lookup ON material_code_mappings(mapping_type, party_type, party_id, normalized_code, is_active)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_code_mappings_code ON material_code_mappings(normalized_code, is_active)`);

  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_uom_conversions_material ON material_uom_conversions(material_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_uom_conversions_lookup ON material_uom_conversions(material_id, from_unit, to_unit, is_active)`);
}

export async function down(_ctx: { sequelize: Sequelize }): Promise<void> {
  // additive / no destructive rollback for sqlite local workflow
}
