const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const FormulaService = require('../services/FormulaService');
const { initDB } = require('../models');

const OUTPUT_FILE = path.join(__dirname, '../../public/data/color-formulas.exported.json');

async function run() {
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
