import { calculateMaterialRequirements } from './materialDecomposer';
import { extractCylinderData, extractLockForkData, extractPackagingData } from './dataExtractors';
import { DataNormalizer } from './dataNormalizer';

type LegacyMappings = {
    cylinderMapping: Record<string, any>;
    lockForkMapping: Record<string, any>;
    packagingMapping: Record<string, any>;
};

export function normalizeMaterialCatalog(rawCatalog: Record<string, any>) {
    return DataNormalizer.normalizeMaterialCatalog(rawCatalog);
}

export function calculateMaterialsFromLegacyEngine(
    items: any[],
    formulas: Record<string, any>,
    catalog: Record<string, any>
) {
    return calculateMaterialRequirements(items, formulas, catalog);
}

export function extractHardwareFromLegacyEngine(
    orderItems: any[],
    orderInfo: Record<string, any>,
    mappings: LegacyMappings
) {
    return {
        cylinders: extractCylinderData(orderItems, orderInfo, mappings.cylinderMapping),
        lockForks: extractLockForkData(orderItems, orderInfo, mappings.lockForkMapping),
        packaging: extractPackagingData(orderItems, mappings.packagingMapping)
    };
}
