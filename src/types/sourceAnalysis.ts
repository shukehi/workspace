export type GenericMap = Record<string, any>;

export interface SourceAnalysisConfig {
    formulas: GenericMap;
    materials: GenericMap;
    cylinderMapping: GenericMap;
    handleMapping: GenericMap;
    lockForkMapping: GenericMap;
    packagingMapping: GenericMap;
}

export interface HardwareRequirements {
    cylinders: any[];
    handles: any[];
    lockForks: any[];
    packaging: GenericMap;
}

export interface SourceAnalysisInput {
    order: any;
    items?: any[];
    config: SourceAnalysisConfig;
}

export interface SourceAnalysisResult {
    materialRequirements: any;
    hardwareRequirements: HardwareRequirements;
    flatMaterials: any[];
    flatCylinders: any[];
    flatHandles: any[];
    flatForks: any[];
    flatPackaging: any[];
}
