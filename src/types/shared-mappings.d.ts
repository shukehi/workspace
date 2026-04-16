declare module '../../../shared/mappings/mapping-adapter-core.mjs' {
  export const defaults: {
    DEFAULT_PACKAGING_SUPPLIER: string;
    DEFAULT_LOCK_FORK_HEIGHT_REFERENCE: number;
    DEFAULT_LOCK_FORK_HANGING_FEET: number;
    DEFAULT_CYLINDER_EXCLUDED: string[];
    DEFAULT_LOCK_UNIT: string;
    DEFAULT_LOCK_PRIMARY_LABEL: string;
    DEFAULT_LOCK_SECONDARY_LABEL: string;
  };

  export function normalizePackagingMappingKey(input: string): string;
  export function normalizeLockMappingKey(input: string): string;
  export function adaptPackagingMapping(value: unknown): unknown;
  export function adaptCylinderMapping(value: unknown): unknown;
  export function adaptLockForkMapping(value: unknown): unknown;
  export function adaptLockMapping(value: unknown): unknown;
}

declare module '../../../shared/mappings/mapping-validator-core.mjs' {
  export function validatePackagingMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
  export function validateCylinderMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
  export function validateLockMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
  export function validateLockForkMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
}
