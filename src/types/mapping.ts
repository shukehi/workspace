export type MappingKind = 'packaging' | 'cylinder' | 'lockFork';
export type PublishedMappingProfileCode = 'packaging' | 'cylinder' | 'lock_fork';

export interface MappingValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface PackagingMappingConfig {
  supplierName: string;
  mappings: Record<string, string>;
}

export interface CylinderDimensionVariant {
  code: string;
  eccentricity: string;
  remark?: string;
}

export interface CylinderDimensionRule extends CylinderDimensionVariant {
  variants?: Record<string, CylinderDimensionVariant>;
}

export interface CylinderSpecialRule {
  conditionField: string;
  keyword: string;
  thickness: string;
  variants: Record<string, CylinderDimensionVariant>;
}

export interface CylinderMappingEntry {
  supplier: string;
  template: string;
}

export interface CylinderMappingConfig {
  dimensions: Record<string, CylinderDimensionRule>;
  specialRules: CylinderSpecialRule[];
  secondaryDimensions: Record<string, CylinderDimensionRule>;
  secondarySpecialRules: CylinderSpecialRule[];
  mappings: Record<string, CylinderMappingEntry>;
  customLogos: string[];
}

export interface LockForkDimensionPair {
  base1: number;
  base2: number;
}

export interface LockForkDimensionGroup {
  upper: LockForkDimensionPair;
  lower: LockForkDimensionPair;
}

export interface LockForkBaseDimensionRule {
  standard?: LockForkDimensionGroup;
  withHangingFeet?: LockForkDimensionGroup;
}

export interface LockForkTypeConfig {
  category?: string;
  nameModifier?: string;
  upper?: string;
  lower?: string;
}

export interface LockForkEdgeTypeConfig {
  nameModifier?: string;
}

export interface LockForkHangingFeetConfig {
  standard: number;
  keywords: string[];
}

export interface LockForkMappingConfig {
  baseDimensions: Record<string, LockForkBaseDimensionRule>;
  lockTypes: Record<string, LockForkTypeConfig>;
  edgeTypes: Record<string, LockForkEdgeTypeConfig>;
  hangingFeet: LockForkHangingFeetConfig;
  heightReference: number;
  suppliers: Record<string, string>;
}

export interface MappingPublishedEnvelope<
  TProfileCode extends PublishedMappingProfileCode,
  TPayload,
> {
  profileCode: TProfileCode;
  revision: number;
  schemaVersion: number;
  updatedAt: string;
  payload: TPayload;
}

export interface MappingPublishedResponse<
  TProfileCode extends PublishedMappingProfileCode,
  TPayload,
> {
  success: true;
  mapping: MappingPublishedEnvelope<TProfileCode, TPayload>;
}

export type CylinderPublishedPayload = CylinderMappingConfig;
export type CylinderPublishedResponse = MappingPublishedResponse<'cylinder', CylinderPublishedPayload>;

export type LockForkPublishedPayload = LockForkMappingConfig;
export type LockForkPublishedResponse = MappingPublishedResponse<'lock_fork', LockForkPublishedPayload>;
