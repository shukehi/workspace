const fs = require('fs');
const path = require('path');
const { initDB, Material } = require('../models');

async function importMaterials() {
    console.log('🚀 Starting Material Migration...');

    // Initialize DB connection
    await initDB();

    // Read JSON
    const jsonPath = path.join(__dirname, '../../public/data/materials-catalog.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('❌ JSON file not found:', jsonPath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const materialsDict = JSON.parse(rawData);

    // Transform to Array
    const materials = Object.values(materialsDict).map(m => ({
        code: m.id || m.model || m.name, // Fallback for code
        name: m.name,
        model: m.model,
        supplier: m.supplier,
        unit: m.unit,
        price: m.unitPrice || 0,
        package_spec: m.packageSpec,
        category: m.type,
        aliases: []
    }));

    console.log(`📋 Found ${materials.length} materials in JSON.`);

    // Bulk Upsert
    let count = 0;
    for (const mat of materials) {
        try {
            const [record, created] = await Material.findOrCreate({
                where: { code: mat.code },
                defaults: mat
            });

            if (!created) {
                // Update if exists (optional, maybe we want to keep DB as source of truth?)
                // For now, let's just update empty fields
                await record.update({
                    price: record.price || mat.price,
                    supplier: record.supplier || mat.supplier
                });
            }
            count++;
        } catch (e) {
            console.error(`⚠️ Failed to import ${mat.code}:`, e.message);
        }
    }

    console.log(`✅ Successfully imported/checked ${count} materials.`);
    process.exit(0);
}

importMaterials();
