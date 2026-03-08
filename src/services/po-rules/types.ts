import type { OrderItem } from '@/types/order';
import type { PackagingMappingConfig } from '@/types/mapping';

export interface SupplierGroup {
  supplierName: string;
  category: string;
  items: OrderItem[];
  totalCost: number;
}

export interface BuildOptions {
  mergeSameSpec?: boolean;
}

export interface PackagingMatcherPort {
  syncFromMapping: (packagingMapping: any) => void;
  match: (internalName: string) => string;
  consumeUnmatchedSummary: (limit?: number) => Array<{ name: string; count: number }>;
}

export interface ConfigLoaderPort {
  getPackagingMapping: () => PackagingMappingConfig;
}

export interface SourceStorePort {
  currentOrder: any;
  materialRequirements: any;
  hardwareRequirements: any;
}

export interface RuleContext {
  sourceStore: SourceStorePort;
  packagingMatcher: PackagingMatcherPort;
  configLoader: ConfigLoaderPort;
}

export interface RuleBuildResult {
  groups: SupplierGroup[];
}
