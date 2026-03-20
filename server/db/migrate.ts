import fs from 'fs';
import path from 'path';
import { Sequelize, QueryInterface } from 'sequelize';

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

interface MigrationContext {
    sequelize: Sequelize;
    queryInterface: QueryInterface;
}

interface Migration {
    id: string;
    name: string;
    up: (ctx: MigrationContext) => Promise<void>;
}

async function ensureMigrationsTable(sequelize: Sequelize): Promise<void> {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

function loadMigrationFiles(): Migration[] {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];

    return fs.readdirSync(MIGRATIONS_DIR)
        .filter((file) => file.endsWith('.js') || file.endsWith('.ts'))
        .sort()
        .map((file) => {
            const migrationPath = path.join(MIGRATIONS_DIR, file);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const migration = require(migrationPath);
            return {
                id: migration.id || file.replace(/\.[jt]s$/, ''),
                name: migration.name || file.replace(/\.[jt]s$/, ''),
                up: migration.up,
            };
        });
}

async function getAppliedMigrationIds(sequelize: Sequelize): Promise<Set<string>> {
    const [rows] = await sequelize.query(`SELECT id FROM ${MIGRATIONS_TABLE}`);
    return new Set((rows as Array<{ id: string }>).map((row) => row.id));
}

async function runMigrations(sequelize: Sequelize): Promise<void> {
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
        console.log(`Applied migration ${migration.id}`);
    }
}

export {
    MIGRATIONS_TABLE,
    MIGRATIONS_DIR,
    runMigrations,
};
