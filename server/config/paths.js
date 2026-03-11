const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_DIR = path.join(DATA_DIR, 'config');
const RUNTIME_DIR = path.join(DATA_DIR, 'runtime');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function ensureProjectDirs() {
    ensureDir(CONFIG_DIR);
    ensureDir(RUNTIME_DIR);
}

const CONFIG_FILES = {
    materialsCatalog: path.join(CONFIG_DIR, 'materials-catalog.json'),
    colorFormulas: path.join(CONFIG_DIR, 'color-formulas.json'),
    packagingMapping: path.join(CONFIG_DIR, 'packaging-mapping.json'),
    cylinderMapping: path.join(CONFIG_DIR, 'cylinder-mapping.json'),
    lockMapping: path.join(CONFIG_DIR, 'lock-mapping.json'),
    lockForkMapping: path.join(CONFIG_DIR, 'lock-fork-mapping.json'),
    handleMapping: path.join(CONFIG_DIR, 'handle-mapping.json'),
    procurementSettings: path.join(CONFIG_DIR, 'procurement-settings.json'),
};

const LEGACY_DATABASE_FILES = [
    path.join(ROOT_DIR, 'database.sqlite'),
    path.join(DATA_DIR, 'database.sqlite'),
];

const RUNTIME_FILES = {
    database: path.join(RUNTIME_DIR, 'database.sqlite'),
    exportedFormulas: path.join(RUNTIME_DIR, 'color-formulas.exported.json'),
};

module.exports = {
    ROOT_DIR,
    DATA_DIR,
    CONFIG_DIR,
    RUNTIME_DIR,
    CONFIG_FILES,
    LEGACY_DATABASE_FILES,
    RUNTIME_FILES,
    ensureDir,
    ensureProjectDirs,
};
