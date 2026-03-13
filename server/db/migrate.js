const fs = require('fs');
const path = require('path');

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(sequelize) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

function loadMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];

    return fs.readdirSync(MIGRATIONS_DIR)
        .filter((file) => file.endsWith('.js'))
        .sort()
        .map((file) => {
            const migrationPath = path.join(MIGRATIONS_DIR, file);
            // eslint-disable-next-line global-require, import/no-dynamic-require
            const migration = require(migrationPath);
            return {
                id: migration.id || file.replace(/\.js$/, ''),
                name: migration.name || file.replace(/\.js$/, ''),
                up: migration.up,
            };
        });
}

async function getAppliedMigrationIds(sequelize) {
    const [rows] = await sequelize.query(`SELECT id FROM ${MIGRATIONS_TABLE}`);
    return new Set(rows.map((row) => row.id));
}

async function runMigrations(sequelize) {
    await ensureMigrationsTable(sequelize);
    const queryInterface = sequelize.getQueryInterface();
    const appliedIds = await getAppliedMigrationIds(sequelize);
    const migrations = loadMigrationFiles();

    for (const migration of migrations) {
        if (appliedIds.has(migration.id)) continue;
        if (typeof migration.up !== 'function') {
            throw new Error(`Migration ${migration.id} is missing an up() function`);
        }

        await migration.up({
            sequelize,
            queryInterface,
        });

        await sequelize.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (id, name) VALUES (?, ?)`,
            {
                replacements: [migration.id, migration.name],
            }
        );
        console.log(`✅ Applied migration ${migration.id}`);
    }
}

module.exports = {
    MIGRATIONS_TABLE,
    MIGRATIONS_DIR,
    runMigrations,
};
