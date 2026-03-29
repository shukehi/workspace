import fs from 'fs';
import path from 'path';
import { InventoryLocationBalance, Material, Warehouse, InventoryLocation, initDB, sequelize } from '../models';
import { buildInventoryReconciliationReport } from '../services/inventory/inventory-reconciliation.service';

type ScriptOptions = {
    json: boolean;
    outputPath: string;
};

function readOptions(argv: string[]): ScriptOptions {
    let json = false;
    let outputPath = '';

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--json') {
            json = true;
            continue;
        }
        if (token === '--output' && argv[index + 1]) {
            outputPath = path.resolve(argv[index + 1]);
            index += 1;
            continue;
        }
        if (token.startsWith('--output=')) {
            outputPath = path.resolve(token.slice('--output='.length));
        }
    }

    return { json, outputPath };
}

async function reconcileInventoryBaselineDryRun() {
    const options = readOptions(process.argv.slice(2));

    try {
        await initDB();

        const materials = await Material.findAll({
            include: [{
                model: InventoryLocationBalance,
                as: 'locationBalances',
                required: false,
                include: [
                    { model: Warehouse, as: 'warehouse', required: false },
                    { model: InventoryLocation, as: 'location', required: false },
                ],
            }],
            order: [['id', 'ASC']],
        });

        const report = buildInventoryReconciliationReport(materials as any[]);

        const payload = {
            generatedAt: new Date().toISOString(),
            mode: 'dry-run',
            ...report,
        };

        if (options.outputPath) {
            fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
            fs.writeFileSync(options.outputPath, JSON.stringify(payload, null, 2), 'utf8');
        }

        if (options.json) {
            console.log(JSON.stringify(payload, null, 2));
        } else {
            console.log('[reconcile_inventory_baseline] dry-run summary', {
                scannedMaterials: report.scannedMaterials,
                mismatchedMaterials: report.mismatchedMaterials,
                matchedMaterials: report.matchedMaterials,
                totalAbsoluteDiff: report.totalAbsoluteDiff,
                outputPath: options.outputPath || null,
            });

            for (const row of report.rows.slice(0, 20)) {
                console.log('[reconcile_inventory_baseline] mismatch', {
                    material_id: row.material_id,
                    material_code: row.material_code,
                    material_model: row.material_model,
                    stock_quantity: row.stock_quantity,
                    location_total: row.location_total,
                    diff_quantity: row.diff_quantity,
                    suggested_target: row.suggested_target,
                });
            }
        }
    } catch (error) {
        console.error('[reconcile_inventory_baseline] failed', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

reconcileInventoryBaselineDryRun();
