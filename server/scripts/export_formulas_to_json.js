const fs = require('fs');
const sequelize = require('../config/database');
const FormulaService = require('../services/formulas');
const { initDB } = require('../models');
const { RUNTIME_FILES, ensureProjectDirs } = require('../config/paths');

const OUTPUT_FILE = RUNTIME_FILES.exportedFormulas;

async function run() {
    ensureProjectDirs();
    await initDB();
    const mapping = await FormulaService.getPublishedFormulasMap();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));
    console.log(`Exported ${Object.keys(mapping).length} formulas to ${OUTPUT_FILE}`);
    await sequelize.close();
}

run().catch(async (err) => {
    console.error('Export failed:', err);
    await sequelize.close();
    process.exit(1);
});
