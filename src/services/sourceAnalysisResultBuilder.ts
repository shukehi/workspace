import type {
  HardwareRequirements,
  SourceAnalysisResult,
} from '@/types/sourceAnalysis';

function flattenMaterials(materialRequirements: any): any[] {
  if (!materialRequirements?.requirements) return [];

  const list: any[] = [];
  Object.values(materialRequirements.requirements).forEach((group: any) => {
    group.materials.forEach((material: any) => {
      list.push({ ...material, supplierName: group.supplierName });
    });
  });
  return list;
}

function flattenPackaging(hardwareRequirements: HardwareRequirements): any[] {
  return Object.values(hardwareRequirements.packaging || {});
}

export function createEmptyHardwareRequirements(): HardwareRequirements {
  return {
    cylinders: [],
    locks: [],
    handles: [],
    lockForks: [],
    accessories: [],
    packaging: {},
  };
}

export function createEmptySourceAnalysisResult(): SourceAnalysisResult {
  const hardwareRequirements = createEmptyHardwareRequirements();

  return {
    materialRequirements: null,
    hardwareRequirements,
    flatMaterials: [],
    flatCylinders: [],
    flatLocks: [],
    flatHandles: [],
    flatForks: [],
    flatAccessories: [],
    flatPackaging: [],
  };
}

export function createSourceAnalysisResult(params: {
  materialRequirements: any;
  hardwareRequirements: HardwareRequirements;
}): SourceAnalysisResult {
  const { materialRequirements, hardwareRequirements } = params;

  return {
    materialRequirements,
    hardwareRequirements,
    flatMaterials: flattenMaterials(materialRequirements),
    flatCylinders: hardwareRequirements.cylinders,
    flatLocks: hardwareRequirements.locks,
    flatHandles: hardwareRequirements.handles,
    flatForks: hardwareRequirements.lockForks,
    flatAccessories: hardwareRequirements.accessories,
    flatPackaging: flattenPackaging(hardwareRequirements),
  };
}
