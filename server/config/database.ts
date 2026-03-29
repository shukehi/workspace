import fs from 'fs';
import path from 'path';
import { Sequelize } from 'sequelize';
import { LEGACY_DATABASE_FILES, RUNTIME_FILES, ensureDir } from './paths';

const storagePath: string = process.env.DB_STORAGE
    ? path.resolve(process.env.DB_STORAGE)
    : RUNTIME_FILES.database;

ensureDir(path.dirname(storagePath));

if (!process.env.DB_STORAGE && !fs.existsSync(storagePath)) {
    const legacyPath = LEGACY_DATABASE_FILES.find((candidate) => fs.existsSync(candidate));
    if (legacyPath) {
        fs.copyFileSync(legacyPath, storagePath);
    }
}

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false, // Set to console.log to see SQL queries
    pool: {
        max: 1,
        min: 1,
        idle: 10000,
        acquire: 30000
    }
});

// Safeguard against accidental data wipe
const isProductionDb = storagePath === path.resolve(RUNTIME_FILES.database);
const originalSync = sequelize.sync.bind(sequelize);
sequelize.sync = async (options?: any) => {
    if (options?.force && isProductionDb) {
        const msg = 'CRITICAL: sequelize.sync({ force: true }) is forbidden on the production database! This prevents accidental data loss during tests or development.';
        console.error(`\x1b[31m${msg}\x1b[0m`);
        throw new Error(msg);
    }
    return originalSync(options);
};

export default sequelize;
