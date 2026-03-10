import type { OrderItem } from '@/types/order';
import type { PackagingMappingConfig } from '@/types/mapping';
import type { PackagingConfigReader } from '@/services/packagingConfig';

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

export interface SourceStorePort {
  currentOrder: any;
  materialRequirements: any;
  hardwareRequirements: any;
}

export interface RuleContext {
  sourceStore: SourceStorePort;
  packagingMatcher: PackagingMatcherPort;
  packagingConfig: PackagingConfigReader;
}

export interface RuleBuildResult {
  groups: SupplierGroup[];
}
