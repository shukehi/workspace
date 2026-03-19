// Script: run with tsx
import fs from 'fs';
import sequelize from '../config/database';
import { initDB, FormulaDefinition, FormulaRevision, FormulaAuditLog } from '../models';
import { CONFIG_FILES } from '../config/paths';

const FORMULAS_FILE = CONFIG_FILES.colorFormulas;

function parseFormulasJson(): Record<string, any> {
    if (!fs.existsSync(FORMULAS_FILE)) return {};
    const raw = fs.readFileSync(FORMULAS_FILE, 'utf8');
    const data = JSON.parse(raw || '{}');
    return data && typeof data === 'object' ? data : {};
}

async function migrate(): Promise<void> {
    await initDB();

    const legacy = parseFormulasJson();
    const entries = Object.entries(legacy);
    console.log(`Found ${entries.length} formulas in legacy JSON`);

    let created = 0;
    let skipped = 0;

    await sequelize.transaction(async (tx) => {
        for (const [formulaKey, value] of entries) {
            const exists = await (FormulaDefinition as any).findOne({
                where: { formula_key: formulaKey },
                transaction: tx
            });
            if (exists) {
                skipped += 1;
                continue;
            }

            const displayName = String((value as any)?.displayName || formulaKey);
            const bom = Array.isArray((value as any)?.bom) ? (value as any).bom : [];
            const payload = JSON.stringify({
                formulaKey,
                displayName,
                bom
            });

            const definition = await (FormulaDefinition as any).create({
                formula_key: formulaKey,
                display_name: displayName,
                category: '',
                status: 'published',
                active_revision: 1
            }, { transaction: tx });

            await (FormulaRevision as any).create({
                formula_id: definition.id,
                revision: 1,
                state: 'published',
                payload_json: payload,
                change_note: 'Migrated from JSON',
                created_by: 'migration-script'
            }, { transaction: tx });

            await (FormulaAuditLog as any).create({
                formula_id: definition.id,
                action: 'create',
                from_revision: null,
                to_revision: 1,
                operator: 'migration-script',
                meta_json: JSON.stringify({ source: 'data/config/color-formulas.json' })
            }, { transaction: tx });

            created += 1;
        }
    });

    console.log(`Migration done. created=${created}, skipped=${skipped}`);
    await sequelize.close();
}

migrate().catch(async (err) => {
    console.error('Migration failed:', err);
    await sequelize.close();
    process.exit(1);
});
