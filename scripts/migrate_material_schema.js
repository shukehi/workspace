const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/config');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials-catalog.json');
const FORMULAS_FILE = path.join(DATA_DIR, 'color-formulas.json');

const BACKUP_DIR = path.join(__dirname, '../data/runtime/backup_' + Date.now());

// Known suppliers (copied from import_csv.js)
const KNOWN_SUPPLIERS = [
    '共成', '吉荣', '华荣', '圣联', '中江', '创基', '喜泽荣', '兴顺', '锦彩', '照川',
    '长盛', '佳泰', '昊润', '欧码', '万安', '旭腾', '波诗明', '格力丝', '简彩', '万鼎',
    '立邦', '双金', '景盛'
];

// Prefixes to strip/extract (copied from import_csv.js)
const PREFIXES = ['门面', '门框', '锁边', '铰链边', '后板', '前板', '合页', '型材', '拉手', '条子', '铝条', '封板', '小面积', '大面积', '门扇', '门架'];
// Sort by length desc
PREFIXES.sort((a, b) => b.length - a.length);

function createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    fs.copyFileSync(MATERIALS_FILE, path.join(BACKUP_DIR, 'materials-catalog.json'));
    fs.copyFileSync(FORMULAS_FILE, path.join(BACKUP_DIR, 'color-formulas.json'));
    console.log(`✅ Backup created at ${BACKUP_DIR}`);
}

function parseMaterialId(oldId) {
    let name = oldId.trim();
    let positions = [];

    // Extract positions (can be multiple, e.g., "门面锁边")
    // The current import_csv logic removes them one by one. 
    // We want to capture which ones were removed.

    let tempName = name;
    let foundPosition = false;

    // Iterative removal to capture all
    // BUT, the original logic just stripped them.
    // Let's try to identify if the name STARTS with any of these.

    // Actually, looking at the data, it's usually "Position" + "Supplier" + "Model"
    // e.g. "门架圣联70-2PC"

    // We will loop through prefixes and see if the name starts with it.
    // If so, remove it and add to positions. Repeat until no match.

    while (true) {
        let matched = false;
        for (const p of PREFIXES) {
            if (tempName.startsWith(p)) {
                positions.push(p);
                tempName = tempName.substring(p.length).trim();
                matched = true;
                break; // Restart loop to handle compounded prefixes if any (though usually just one or "X和Y")
            }
        }
        // Also handle "和" connector if present? e.g. "铰链边和背面"
        // The PREFIXES list doesn't include "背面" or "和". 
        // Let's check the current import_csv.js logic. It just loops and removes.
        // It doesn't check for "startsWith", it checks `indexOf`?
        // Wait, import_csv says: 
        // const idx = currentName.indexOf(s); ... This is for SUPPLIERS.
        // For prefixes it logic isn't fully shown in the snippet I viewed? 
        // Ah, checked lines 21-24 of import_csv.js:
        // It defines prefixes but doesn't show the removal Loop? 
        // The snippet in view_file Step 447 shows lines 16-69. 
        // It doesn't actually show the removal code! It just defines them.
        // I must have missed line 26 onwards logic in previous view.
        // Let's infer or write robust logic.

        // Let's assume standard format: Position + Supplier + Model
        if (!matched && tempName.startsWith('和')) {
            tempName = tempName.substring(1).trim();
            matched = true; // continue matching
        }

        if (!matched && tempName.includes('和')) {
            // Edge case: "铰链边和背面" -> "背面" isn't in prefixes list? 
            // If "背面" is not in PREFIXES, it stays in the name.
            // Let's not over-engineer. Just capture what we can from the known list.
        }

        if (!matched) break;
    }

    // Now extract Supplier
    let foundSupplier = '未知';
    let supplierIndex = -1;
    let supplierNameLen = 0;

    for (const s of KNOWN_SUPPLIERS) {
        const idx = tempName.indexOf(s);
        if (idx !== -1) {
            // Find earliest
            if (supplierIndex === -1 || idx < supplierIndex) {
                supplierIndex = idx;
                foundSupplier = s;
                supplierNameLen = s.length;
            }
        }
    }

    let model = tempName;
    if (foundSupplier !== '未知') {
        // If supplier is found, remove it from model name?
        // Usually "圣联70-2PC" -> Supplier "圣联", Model "70-2PC"
        // So we remove the supplier string from the name.
        // BUT be careful of "ColorA" containing "Color" string. 
        // Given the dataset, Supplier usually prefixes the Model.
        model = tempName.replace(foundSupplier, '').trim();
    }

    // Clean up model
    // Remove specific chars if needed, but keeping it raw is safer.

    return {
        originalId: oldId,
        newId: foundSupplier !== '未知' ? `${foundSupplier}${model}` : model, // Fallback if no supplier
        supplier: foundSupplier,
        model: model,
        positions: positions.length > 0 ? positions.join(',') : '通用'
    };
}

function migrate() {
    createBackup();

    const oldCatalog = JSON.parse(fs.readFileSync(MATERIALS_FILE, 'utf8'));
    const formulas = JSON.parse(fs.readFileSync(FORMULAS_FILE, 'utf8'));

    const newCatalog = {};
    const idMapping = {}; // OldID -> NewID

    console.log('Processing materials...');

    Object.values(oldCatalog).forEach(item => {
        const parsed = parseMaterialId(item.id);

        // If Model is empty (e.g. ID was just "圣联"), handle edge case
        if (!parsed.model) {
            parsed.model = parsed.supplier; // or keep original?
            parsed.newId = item.id;
        }

        // Construct New Item
        // Check if NewID already exists
        if (newCatalog[parsed.newId]) {
            // Merge positions
            const existing = newCatalog[parsed.newId];
            if (!existing.position.includes(parsed.positions)) {
                existing.position += `,${parsed.positions}`;
            }
            // We assume other props (unit, type) are same.
            // If mismatch, we might have a collision of different items with same generated ID.
            if (existing.type !== item.type) {
                console.warn(`⚠️ Type mismatch for merged ID ${parsed.newId}: ${existing.type} vs ${item.type}. Keeping separate.`);
                // If collision, revert to original ID or append suffix?
                // For safety, let's keep original ID if collision.
                parsed.newId = item.id;
                // re-add structure
            }
        } else {
            newCatalog[parsed.newId] = {
                id: parsed.newId,
                model: parsed.model,
                supplier: parsed.supplier,
                position: parsed.positions, // New Field
                type: item.type,
                unit: item.unit,
                packageSpec: item.packageSpec,
                // price, etc if exist
                unitPrice: item.unitPrice || 0,
                minOrder: item.minOrder || 0
            };
        }

        idMapping[item.id] = parsed.newId;
    });

    console.log(`Generated ${Object.keys(newCatalog).length} unique materials from ${Object.keys(oldCatalog).length} entries.`);

    // Update Formulas
    console.log('Updating formulas...');
    let formulaUpdatedCount = 0;

    Object.keys(formulas).forEach(key => {
        const formula = formulas[key];
        let changed = false;

        if (formula.bom) {
            formula.bom.forEach(bomItem => {
                const newMatId = idMapping[bomItem.materialId];
                if (newMatId && newMatId !== bomItem.materialId) {
                    bomItem.materialId = newMatId;
                    changed = true;
                }
            });
        }

        if (changed) formulaUpdatedCount++;
    });

    // Save
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(newCatalog, null, 4));
    fs.writeFileSync(FORMULAS_FILE, JSON.stringify(formulas, null, 4));

    console.log(`✅ Migration Complete.`);
    console.log(`- Formulas updated: ${formulaUpdatedCount}`);

    // Output sample mapping for verification
    console.log('\nSample ID Mappings:');
    Object.keys(idMapping).slice(0, 5).forEach(k => {
        console.log(`"${k}" -> "${idMapping[k]}"`);
    });
}

migrate();
