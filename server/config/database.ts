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
});

export default sequelize;
