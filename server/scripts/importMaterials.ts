// Script: run with tsx
import fs from 'fs';
import sequelize from '../config/database';
import { initDB, Material } from '../models';
import { CONFIG_FILES } from '../config/paths';

async function importMaterials(): Promise<void> {
    console.log('Starting Material Migration...');

    await initDB();

    const jsonPath = CONFIG_FILES.materialsCatalog;
    if (!fs.existsSync(jsonPath)) {
        console.error('JSON file not found:', jsonPath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const materialsDict: Record<string, any> = JSON.parse(rawData);

    const materials = Object.values(materialsDict).map((m: any) => ({
        code: m.id || m.model || m.name,
        name: m.name,
        model: m.model,
        supplier: m.supplier,
        unit: m.unit,
        price: m.unitPrice || 0,
        package_spec: m.packageSpec,
        category: m.type,
        aliases: []
    }));

    console.log(`Found ${materials.length} materials in JSON.`);

    let count = 0;
    for (const mat of materials) {
        try {
            const [record, created] = await Material.findOrCreate({
                where: { code: mat.code },
                defaults: mat
            });

            if (!created) {
                const r = record as unknown as Record<string, any>;
                await record.update({
                    price: r['price'] || mat.price,
                    supplier: r['supplier'] || mat.supplier
                });
            }
            count++;
        } catch (e: any) {
            console.error(`Failed to import ${mat.code}:`, e.message);
        }
    }

    console.log(`Successfully imported/checked ${count} materials.`);
}

importMaterials().catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
}).finally(() => sequelize.close());
