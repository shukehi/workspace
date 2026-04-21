import type { Sequelize } from 'sequelize';

export const id = '20260421-015-add-material-master-audit-log';
export const name = 'add material master audit log';

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS material_master_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL,
      action VARCHAR(64) NOT NULL,
      operator VARCHAR(255) NOT NULL DEFAULT 'system-admin',
      meta_json TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_material_master_audit_material ON material_master_audit_logs(material_id)`);
}

export async function down(_ctx: { sequelize: Sequelize }): Promise<void> {
  // additive / no destructive rollback for sqlite local workflow
}
