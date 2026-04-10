export type MappingKind = 'packaging' | 'cylinder' | 'lockFork' | 'handle' | 'lock';
export type PublishedMappingProfileCode = 'packaging' | 'cylinder' | 'lock_fork' | 'handle' | 'lock';

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

export interface CylinderAccessoryPackRule {
  conditionField: string;
  keyword: string;
  supplier: string;
  thicknessAccessoryPacks: Record<string, string>;
  thicknessMaterialCodes: Record<string, string>;
  itemName?: string;
  unit?: string;
  remark?: string;
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
  secondaryAccessoryPackRules: CylinderAccessoryPackRule[];
  mappings: Record<string, CylinderMappingEntry>;
  customLogos: string[];
  excludedCylinders: string[];
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

export interface LockForkHighHeightRule extends LockForkBaseDimensionRule {
  minHeight: number;
  heightReference: number;
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
  highHeightRules: Record<string, LockForkHighHeightRule>;
  lockTypes: Record<string, LockForkTypeConfig>;
  edgeTypes: Record<string, LockForkEdgeTypeConfig>;
  hangingFeet: LockForkHangingFeetConfig;
  heightReference: number;
  suppliers: Record<string, string>;
}

export interface HandleMappingEntry {
  supplier: string;
  vendorName: string;
  materialCode?: string;
}

export interface HandleMappingConfig {
  defaultSupplier: string;
  unmatchedSupplier: string;
  manualReviewLabel: string;
  singleKeywords: string[];
  doubleKeywords: string[];
  exportCustomerKeywords: string[];
  defaultActivityForExport: 'single' | 'double';
  placeholderKeywords: string[];
  fallbackModelSources: Array<'remark' | 'xsbz'>;
  thicknessAccessoryPacks: Record<string, string>;
  mappings: Record<string, HandleMappingEntry>;
}

export interface LockMappingEntry {
  supplier: string;
  vendorName: string;
  primarySpec?: string;
  secondarySpec?: string;
  remark?: string;
}

export interface LockMappingConfig {
  defaultUnit: string;
  primaryLabel: string;
  secondaryLabel: string;
  mappings: Record<string, LockMappingEntry>;
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

export type HandlePublishedPayload = HandleMappingConfig;
export type HandlePublishedResponse = MappingPublishedResponse<'handle', HandlePublishedPayload>;

export type LockPublishedPayload = LockMappingConfig;
export type LockPublishedResponse = MappingPublishedResponse<'lock', LockPublishedPayload>;
