import type { Sequelize } from 'sequelize';

export const id = '20260421-013-link-materials-to-supplier-master';
export const name = 'link materials to supplier master';

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
  await sequelize.query(`ALTER TABLE materials ADD COLUMN supplier_master_id INTEGER REFERENCES supplier_masters(id)`)
    .catch(() => undefined);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_materials_supplier_master_id ON materials(supplier_master_id)`);

  await sequelize.query(`
    UPDATE materials
    SET supplier_master_id = (
      SELECT sm.id
      FROM supplier_masters sm
      WHERE LOWER(TRIM(sm.supplier_name)) = LOWER(TRIM(COALESCE(materials.supplier, '')))
         OR LOWER(TRIM(sm.normalized_name)) = LOWER(TRIM(COALESCE(materials.supplier, '')))
      LIMIT 1
    )
    WHERE COALESCE(TRIM(supplier), '') <> ''
      AND supplier_master_id IS NULL
  `);
}

export async function down(_ctx: { sequelize: Sequelize }): Promise<void> {
  // SQLite cannot safely drop the column without table rebuild; keep additive migration irreversible.
}
