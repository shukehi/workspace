/**
 * Material Decomposer
 * Decomposes finished colors into raw materials with usage calculations
 */

import { parseQuantityPair } from './parsers.js';

/**
 * Detect door type based on product name keywords
 * @param {string} qty - Quantity string (kept for potential future hybrid logic, but currently secondary)
 * @param {string} productName - Product model name (e.g., "D-013/JY-229")
 * @returns {string} 'single' | 'double' | 'paired'
 */
export function detectDoorType(qty, productName = '') {
    // Normalize input
    const name = productName ? productName.toString() : '';

    // 1. Check keywords in product name (Priority)
    if (name.includes('对开') || name.includes('双开')) {
        return 'paired';
    }

    if (name.includes('子母')) {
        return 'double';
    }

    // 2. Default fallback
    // As per user request: if no keywords found, default to 'single'
    return 'single';
}

/**
 * Get total door count from quantity string
 * @param {string} qty - Quantity like "3/3"
 * @returns {number} Total door count
 */
export function getDoorCount(qty) {
    const { left, right } = parseQuantityPair(qty);
    return left + right;
}

/**
 * Calculate material requirements from order items
 * @param {Array} items - Order items with color and qty
 * @param {Object} formulas - Color formulas mapping
 * @param {Object} catalog - Materials catalog
 * @returns {Object} Material requirements grouped by supplier
 */
export function calculateMaterialRequirements(items, formulas, catalog) {
    const requirements = new Map();
    const missingFormulas = new Set();

    items.forEach(item => {
        const formula = formulas[item.color];

        if (!formula) {
            missingFormulas.add(item.color);
            return;
        }

        const doorType = detectDoorType(item.qty, item.productModelName);
        const doorCount = getDoorCount(item.qty);

        formula.bom.forEach(bomItem => {
            const materialId = bomItem.materialId;
            const material = catalog[materialId];

            if (!material) {
                console.warn(`Material not found in catalog: ${materialId}`);
                return;
            }

            const usagePerDoor = bomItem.usage[doorType];
            const totalUsage = usagePerDoor * doorCount;

            if (!requirements.has(materialId)) {
                requirements.set(materialId, {
                    materialId,
                    material,
                    totalUsage: 0,
                    details: []
                });
            }

            const req = requirements.get(materialId);
            req.totalUsage += totalUsage;
            req.details.push({
                orderCode: item._originOrder,
                color: item.color,
                doorType,
                doorCount,
                usage: totalUsage
            });
        });
    });

    // Log missing formulas
    if (missingFormulas.size > 0) {
        console.warn('⚠️ Missing formulas for colors:', Array.from(missingFormulas).join(', '));
    }

    // Return both requirements and missing items for UI handling
    return {
        requirements: groupBySupplier(requirements, catalog),
        missing: Array.from(missingFormulas)
    };
}

/**
 * Group materials by supplier
 * @param {Map} requirements - Material requirements map
 * @param {Object} catalog - Materials catalog
 * @returns {Object} Requirements grouped by supplier
 */
function groupBySupplier(requirements, catalog) {
    const bySupplier = {};

    requirements.forEach(req => {
        const supplier = req.material.supplier;

        if (!bySupplier[supplier]) {
            bySupplier[supplier] = {
                supplierName: supplier,
                materials: [],
                totalItems: 0
            };
        }

        bySupplier[supplier].materials.push(req);
        bySupplier[supplier].totalItems++;
    });

    return bySupplier;
}

/**
 * Calculate package quantities based on minimum order
 * @param {number} totalUsage - Total usage amount
 * @param {number} minOrder - Minimum order quantity
 * @returns {Object} Package calculation result
 */
export function calculatePackages(totalUsage, minOrder) {
    if (!minOrder || minOrder === 0) {
        return {
            packages: 0,
            orderQuantity: totalUsage,
            surplus: 0
        };
    }

    const packages = Math.ceil(totalUsage / minOrder);
    const orderQuantity = packages * minOrder;
    const surplus = orderQuantity - totalUsage;

    return {
        packages,
        orderQuantity,
        surplus
    };
}

/**
 * Get material summary statistics
 * @param {Object} groupedRequirements - Requirements grouped by supplier
 * @returns {Object} Summary statistics
 */
export function getMaterialSummary(groupedRequirements) {
    let totalSuppliers = 0;
    let totalMaterials = 0;
    let totalCost = 0;

    Object.values(groupedRequirements).forEach(group => {
        totalSuppliers++;
        totalMaterials += group.materials.length;

        group.materials.forEach(mat => {
            if (mat.material.unitPrice) {
                totalCost += mat.totalUsage * mat.material.unitPrice;
            }
        });
    });

    return {
        totalSuppliers,
        totalMaterials,
        totalCost: totalCost.toFixed(2)
    };
}
