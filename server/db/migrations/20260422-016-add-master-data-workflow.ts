import type { Sequelize } from 'sequelize';

export const id = '20260422-016-add-master-data-workflow';
export const name = 'add master data workflow tables';

export async function up({ sequelize }: { sequelize: Sequelize }): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS master_data_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_code VARCHAR(64) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'active',
      active_revision INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS master_data_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      revision INTEGER NOT NULL,
      state VARCHAR(32) NOT NULL DEFAULT 'draft',
      payload_json TEXT NOT NULL DEFAULT '[]',
      change_note VARCHAR(255),
      created_by VARCHAR(255) NOT NULL DEFAULT 'system-admin',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES master_data_profiles(id)
    )
  `);

  await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_master_data_revision_unique ON master_data_revisions(profile_id, revision)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_master_data_revision_state ON master_data_revisions(profile_id, state)`);
}

export async function down(_ctx: { sequelize: Sequelize }): Promise<void> {
  // additive / no destructive rollback for sqlite local workflow
}
