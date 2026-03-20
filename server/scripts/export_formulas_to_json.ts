// Script: run with tsx
import fs from 'fs';
import sequelize from '../config/database';
import { getPublishedFormulasMap } from '../services/formulas/formula.workflow';
import { initDB } from '../models';
import { RUNTIME_FILES, ensureProjectDirs } from '../config/paths';

const OUTPUT_FILE = RUNTIME_FILES.exportedFormulas;

async function run(): Promise<void> {
    ensureProjectDirs();
    await initDB();
    const mapping = await getPublishedFormulasMap();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));
    console.log(`Exported ${Object.keys(mapping).length} formulas to ${OUTPUT_FILE}`);
    await sequelize.close();
}

run().catch(async (err) => {
    console.error('Export failed:', err);
    await sequelize.close();
    process.exit(1);
});
