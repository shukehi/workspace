const fs = require('fs');
const path = require('path');

// Configuration
const CSV_FILE = '/Users/aries/Dve/workspace/color.csv';
const MATERIALS_FILE = '/Users/aries/Dve/workspace/public/data/materials-catalog.json';
const FORMULAS_FILE = '/Users/aries/Dve/workspace/public/data/color-formulas.json';

// Known suppliers for smart extraction
const KNOWN_SUPPLIERS = [
    '共成', '吉荣', '华荣', '圣联', '中江', '创基', '喜泽荣', '兴顺', '锦彩', '照川',
    '长盛', '佳泰', '昊润', '欧码', '万安', '旭腾', '波诗明', '格力丝', '简彩', '万鼎',
    '立邦', '双金', '景盛'
];

// Helper to clean material name and extract supplier
function parseMaterial(rawName, type) {
    if (!rawName) return null;
    let name = rawName.trim();

    // Identify Position Prefixes
    const prefixes = ['门面', '门框', '锁边', '铰链边', '后板', '前板', '合页', '型材', '拉手', '条子', '铝条', '封板', '小面积', '大面积', '门扇', '门架'];
    prefixes.sort((a, b) => b.length - a.length);

    let positions = [];
    let tempName = name;

    // Iteratively extract positions from the start
    while (true) {
        let matched = false;
        for (const p of prefixes) {
            if (tempName.startsWith(p)) {
                positions.push(p);
                tempName = tempName.substring(p.length).trim();
                matched = true;
                break;
            }
        }
        // Handle "和" connector if present (simple check)
        if (!matched && tempName.startsWith('和')) {
            tempName = tempName.substring(1).trim();
            matched = true;
        }
        if (!matched) break;
    }

    // Extract Supplier
    let foundSupplier = '未知';
    let supplierIndex = -1;

    for (const s of KNOWN_SUPPLIERS) {
        const idx = tempName.indexOf(s);
        if (idx !== -1) {
            if (supplierIndex === -1 || idx < supplierIndex) {
                supplierIndex = idx;
                foundSupplier = s;
            }
        }
    }

    let model = tempName;
    if (foundSupplier !== '未知') {
        // Strip supplier from name to get pure Model
        model = tempName.replace(foundSupplier, '').trim();
    }

    // Determine unit and package spec based on type
    let unit = '个';
    let packageSpec = 'N/A';

    if (type === '塑粉') {
        unit = 'kg';
        packageSpec = '20kg/箱';
    } else if (type === '转印纸') {
        unit = 'm';
        packageSpec = '500m/卷';
    } else if (type === '油漆') {
        unit = 'kg';
        packageSpec = '20kg/桶';
    }

    // New ID construction: Supplier + Model
    const newId = foundSupplier !== '未知' ? `${foundSupplier}${model}` : model;

    return {
        id: newId,
        model: model,
        position: positions.length > 0 ? positions.join(',') : '通用', // Return for Formula usage
        type: type,
        supplier: foundSupplier,
        unit: unit,
        unitPrice: 0,
        minOrder: 0,
        packageSpec: packageSpec
    };
}

// Find column indices based on headers
function findColumnGroups(headers) {
    const groups = [];
    const types = ['塑粉', '转印纸', '油漆'];

    types.forEach(type => {
        // Look for columns starting with the type name (e.g., "塑粉1", "塑粉2")
        // We assume the structure is always [Name, SingleUsage, PairedUsage] corresponding to columns [i, i+1, i+2]

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            const namePattern = new RegExp(`^${type}\\d+$`);

            if (namePattern.test(header)) {
                if (headers[i + 1] && headers[i + 1].includes('单门') &&
                    headers[i + 2] && headers[i + 2].includes('子母')) {

                    groups.push({
                        type: type,
                        indexes: [i]
                    });
                    console.log(`Found ${type} group at index ${i}: ${header}, ${headers[i + 1]}, ${headers[i + 2]}`);
                }
            }
        }
    });

    return groups;
}

// Main logic
try {
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = csvContent.split('\n');

    if (lines.length < 3) {
        throw new Error('CSV file too short');
    }

    const headerLine = lines[1].trim();
    const headers = headerLine.split(',');

    console.log('Parsing headers...');
    const processGroups = findColumnGroups(headers);

    if (processGroups.length === 0) {
        console.warn('⚠️ No material groups found in headers! Checking hardcoded fallback...');
    }

    const catalog = {};
    const formulas = {};
    let countFormulas = 0;

    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV split strictly
        const cols = line.split(',');
        const colorName = cols[0];

        if (!colorName) continue;

        const formula = {
            displayName: colorName,
            category: '默认',
            bom: []
        };

        processGroups.forEach(group => {
            group.indexes.forEach(baseIdx => {
                const matName = cols[baseIdx];
                const usageSingle = parseFloat(cols[baseIdx + 1] || 0);
                const usagePaired = parseFloat(cols[baseIdx + 2] || 0);

                if (matName && matName.trim()) {
                    const matObj = parseMaterial(matName, group.type);

                    // 1. Add to Catalog (WITHOUT Position)
                    if (!catalog[matObj.id]) {
                        catalog[matObj.id] = {
                            id: matObj.id,
                            model: matObj.model,
                            type: matObj.type,
                            supplier: matObj.supplier,
                            unit: matObj.unit,
                            unitPrice: matObj.unitPrice,
                            minOrder: matObj.minOrder,
                            packageSpec: matObj.packageSpec
                            // No 'position' here!
                        };
                    }

                    // 2. Add to Formula BOM (WITH Position)
                    formula.bom.push({
                        materialId: matObj.id,
                        position: matObj.position, // <--- Position lives here now
                        usage: {
                            single: usageSingle,
                            double: Number((usageSingle * 2).toFixed(2)),
                            paired: usagePaired
                        }
                    });
                }
            });
        });

        formulas[colorName] = formula;
        countFormulas++;
    }

    // Write output files
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(catalog, null, 4));
    fs.writeFileSync(FORMULAS_FILE, JSON.stringify(formulas, null, 4));

    console.log(`✅ Import successful!`);
    console.log(`- Formulas processed: ${countFormulas}`);
    console.log(`- Unique materials created: ${Object.keys(catalog).length}`);

} catch (e) {
    console.error('Error processing CSV:', e);
}
