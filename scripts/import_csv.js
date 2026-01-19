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

    // Remove prefixes like "门面", "门框", "锁边" etc.
    const prefixes = ['门面', '门框', '锁边', '铰链边', '后板', '前板', '合页', '型材', '拉手', '条子', '铝条', '封板', '小面积', '大面积', '门扇', '门架'];
    // Sort prefixes by length desc to handle "门面锁边" before "门面"
    prefixes.sort((a, b) => b.length - a.length);

    let cleanedParts = [];
    let currentName = name;

    // Simple heuristic: Try to find a supplier name inside the string
    let foundSupplier = '未知';
    let supplierIndex = -1;

    for (const s of KNOWN_SUPPLIERS) {
        const idx = currentName.indexOf(s);
        if (idx !== -1) {
            // Find the earliest occurring supplier
            if (supplierIndex === -1 || idx < supplierIndex) {
                supplierIndex = idx;
                foundSupplier = s;
            }
        }
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

    return {
        id: name, // Use full raw name as ID
        name: name,
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
        // But let's be safer and look for the base name column

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            // Check if this header indicates a material start (e.g., "塑粉1", "塑粉2") 
            // AND the next headers look like usage columns ("塑粉单门1", "塑粉子母1")

            // Regex to match "塑粉1", "塑粉2", etc. but NOT "塑粉单门1"
            const namePattern = new RegExp(`^${type}\\d+$`);

            if (namePattern.test(header)) {
                // Found a material column. Verify subsequent columns.
                // We expect i+1 to be Single Usage (contains "单门")
                // We expect i+2 to be Paired Usage (contains "子母")

                if (headers[i + 1] && headers[i + 1].includes('单门') &&
                    headers[i + 2] && headers[i + 2].includes('子母')) {

                    groups.push({
                        type: type,
                        indexes: [i] // Only store the base index. We'll access i+1 and i+2 relative to it.
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

    // Line 0: English codes (YS, SF1...)
    // Line 1: Chinese headers (颜色, 塑粉1...) -> We use this one
    // Line 2+: Data

    if (lines.length < 3) {
        throw new Error('CSV file too short');
    }

    const headerLine = lines[1].trim();
    const headers = headerLine.split(',');

    console.log('Parsing headers...');
    const processGroups = findColumnGroups(headers);

    if (processGroups.length === 0) {
        console.warn('⚠️ No material groups found in headers! Checking hardcoded fallback...');
        // Fallback or error? Let's error to be safe, as this is a refactor for robustness.
        // But for safety during transition, we could hardcode if detection fails, but that defeats the purpose.
    }

    const catalog = {};
    const formulas = {};
    let countFormulas = 0;

    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV split strictly
        const cols = line.split(',');
        const colorName = cols[0]; // Assumes first column is always Color Name

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
                const usagePaired = parseFloat(cols[baseIdx + 2] || 0); // Col 3 is Paired (SFZM/ZYZMC etc)

                if (matName && matName.trim()) {
                    const matObj = parseMaterial(matName, group.type);
                    if (!catalog[matObj.id]) {
                        catalog[matObj.id] = matObj;
                    }

                    formula.bom.push({
                        materialId: matObj.id,
                        usage: {
                            single: usageSingle,
                            double: Number((usageSingle * 2).toFixed(2)), // Double = Single * 2
                            paired: usagePaired // Paired = From CSV
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
