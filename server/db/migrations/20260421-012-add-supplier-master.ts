import type { Sequelize } from 'sequelize';

export const id = '20260421-012-add-supplier-master';
export const name = 'add supplier master table';

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS supplier_masters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_name VARCHAR(255) NOT NULL UNIQUE,
      normalized_name VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      source_note VARCHAR(255),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_supplier_masters_status ON supplier_masters(status)`);
}

export async function down({ sequelize }: { sequelize: Sequelize }): Promise<void> {
  await sequelize.query(`DROP TABLE IF EXISTS supplier_masters`);
}
