import { calculateMaterialRequirements } from '@/lib/erp-engine/materialDecomposer';
import {
    extractCylinderData,
    extractLockData,
    extractHandleData,
    extractLockForkData,
    extractPackagingData,
} from '@/lib/erp-engine/dataExtractors';
import type {
    HardwareRequirements,
    SourceAnalysisInput,
    SourceAnalysisResult,
} from '@/types/sourceAnalysis';

function buildFlatMaterials(materialRequirements: any): any[] {
    if (!materialRequirements?.requirements) return [];

    const list: any[] = [];
    Object.values(materialRequirements.requirements).forEach((group: any) => {
        group.materials.forEach((material: any) => {
            list.push({ ...material, supplierName: group.supplierName });
        });
    });
    return list;
}

function buildFlatPackaging(hardwareRequirements: HardwareRequirements): any[] {
    return Object.values(hardwareRequirements.packaging || {});
}

export function analyzeSourceOrder(input: SourceAnalysisInput): SourceAnalysisResult {
    const { order, config } = input;
    const targetItems = input.items || order?.list || [];

    if (!order || !Array.isArray(targetItems) || targetItems.length === 0) {
        const hardwareRequirements: HardwareRequirements = {
            cylinders: [],
            locks: [],
            handles: [],
            lockForks: [],
            packaging: {},
        };

        return {
            materialRequirements: null,
            hardwareRequirements,
            flatMaterials: [],
            flatCylinders: [],
            flatLocks: [],
            flatHandles: [],
            flatForks: [],
            flatPackaging: [],
        };
    }

    const items = targetItems.map((item: any, index: number) => ({
        ...item,
        _originOrder: order.code,
        _originIndex: index,
    }));

    const materialRequirements = calculateMaterialRequirements(
        items,
        config.formulas,
        config.materials,
    );

    const hardwareRequirements: HardwareRequirements = {
        cylinders: extractCylinderData(targetItems, order, config.cylinderMapping),
        locks: extractLockData(targetItems, order, config.lockMapping),
        handles: extractHandleData(targetItems, order, config.handleMapping),
        lockForks: extractLockForkData(targetItems, order, config.lockForkMapping),
        packaging: extractPackagingData(targetItems, config.packagingMapping),
    };

    return {
        materialRequirements,
        hardwareRequirements,
        flatMaterials: buildFlatMaterials(materialRequirements),
        flatCylinders: hardwareRequirements.cylinders,
        flatLocks: hardwareRequirements.locks,
        flatHandles: hardwareRequirements.handles,
        flatForks: hardwareRequirements.lockForks,
        flatPackaging: buildFlatPackaging(hardwareRequirements),
    };
}
