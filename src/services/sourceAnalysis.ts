import { calculateMaterialRequirements } from '@/lib/erp-engine/materialDecomposer';
import {
    extractCylinderData,
    extractCylinderAccessoryPackData,
    extractLockData,
    extractHandleData,
    extractLockForkData,
    extractPackagingData,
} from '@/lib/erp-engine/dataExtractors';
import {
    createEmptySourceAnalysisResult,
    createSourceAnalysisResult,
} from '@/services/sourceAnalysisResultBuilder';
import type {
    HardwareRequirements,
    SourceAnalysisInput,
    SourceAnalysisResult,
} from '@/types/sourceAnalysis';

export function analyzeSourceOrder(input: SourceAnalysisInput): SourceAnalysisResult {
    const { order, config } = input;
    const targetItems = input.items || order?.list || [];

    if (!order || !Array.isArray(targetItems) || targetItems.length === 0) {
        return createEmptySourceAnalysisResult();
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
        accessories: extractCylinderAccessoryPackData(targetItems, config.cylinderMapping),
        packaging: extractPackagingData(targetItems, config.packagingMapping),
    };

    return createSourceAnalysisResult({
        materialRequirements,
        hardwareRequirements,
    });
}
