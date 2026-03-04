/**
 * Material Decomposer
 * Decomposes finished colors into raw materials with usage calculations
 */

import { parseQuantityPair } from './parsers';

type DoorType = 'single' | 'double' | 'paired';
type OrderItem = Record<string, any>;
type FormulasMap = Record<string, any>;
type CatalogMap = Record<string, any>;
type RequirementEntry = {
    materialId: string;
    material: Record<string, any>;
    totalUsage: number;
    details: Array<{
        orderCode: string;
        color: string;
        doorType: DoorType;
        doorCount: number;
        usage: number;
    }>;
};
type SupplierGroup = {
    supplierName: string;
    materials: RequirementEntry[];
    totalItems: number;
};

/**
 * Detect door type based on product name keywords
 * @param {string} qty - Quantity string (kept for potential future hybrid logic, but currently secondary)
 * @param {string} productName - Product model name (e.g., "D-013/JY-229")
 * @returns {string} 'single' | 'double' | 'paired'
 */
export function detectDoorType(qty: unknown, productName = ''): DoorType {
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
export function getDoorCount(qty: string | number | null | undefined): number {
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
export function calculateMaterialRequirements(items: OrderItem[], formulas: FormulasMap, catalog: CatalogMap) {
    const requirements = new Map<string, RequirementEntry>();
    const missingFormulas = new Set<string>();

    items.forEach((item) => {
        // Skip items excluded from statistics
        if (item._excludeStats) return;

        const formula = formulas[item.color];

        if (!formula) {
            missingFormulas.add(item.color);
            return;
        }

        const doorType = detectDoorType(item.qty, item.productModelName);
        const doorCount = getDoorCount(item.qty);

        formula.bom.forEach((bomItem: Record<string, any>) => {
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
            if (req) {
                req.totalUsage += totalUsage;
                req.details.push({
                    orderCode: item._originOrder,
                    color: item.color,
                    doorType,
                    doorCount,
                    usage: totalUsage
                });
            }
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
 * Wrapper function for UI consumption
 * Handles calculation and formatting in one go.
 */
export function getMaterialsForUI(items: OrderItem[], formulas: FormulasMap, catalog: CatalogMap) {
    // 1. Calculate
    const { requirements, missing } = calculateMaterialRequirements(items, formulas, catalog);

    // 2. Format as Array for v-for
    const supplierGroups = Object.entries(requirements).map(([supplier, group]) => ({
        supplier,
        ...group
    }));

    // 3. Return UI-ready object
    return {
        supplierGroups,
        missingFormulas: missing || [],
        hasData: supplierGroups.length > 0
    };
}

/**
 * Group materials by supplier
 * @param {Map} requirements - Material requirements map
 * @param {Object} catalog - Materials catalog
 * @returns {Object} Requirements grouped by supplier
 */
function groupBySupplier(requirements: Map<string, RequirementEntry>, catalog: CatalogMap): Record<string, SupplierGroup> {
    const bySupplier: Record<string, SupplierGroup> = {};

    requirements.forEach((req) => {
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
export function calculatePackages(totalUsage: number, minOrder: number) {
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
export function getMaterialSummary(groupedRequirements: Record<string, SupplierGroup>) {
    let totalSuppliers = 0;
    let totalMaterials = 0;
    let totalCost = 0;

    Object.values(groupedRequirements).forEach((group) => {
        totalSuppliers++;
        totalMaterials += group.materials.length;

        group.materials.forEach((mat) => {
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
