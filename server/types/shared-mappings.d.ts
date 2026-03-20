declare module '../../../shared/mappings/mapping-validator-core.mjs' {
    export function validatePackagingMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
    export function validateCylinderMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
    export function validateLockMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
    export function validateLockForkMapping(value: unknown): Array<{ path: string; code: string; message: string }>;
}
