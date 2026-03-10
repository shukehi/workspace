import { configLoader } from '@/services/configLoader';
import type { PackagingMappingConfig } from '@/types/mapping';

export interface PackagingConfigReader {
    getPackagingMapping(): PackagingMappingConfig;
}

export function getPackagingMapping(): PackagingMappingConfig {
    return configLoader.getPackagingMapping();
}

export const packagingConfigReader: PackagingConfigReader = {
    getPackagingMapping,
};
