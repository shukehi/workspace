
import { DataNormalizer } from '@/lib/erp-engine/dataNormalizer';
import {
    adaptCylinderMapping,
    adaptHandleMapping,
    adaptLockMapping,
    adaptLockForkMapping,
    adaptPackagingMapping,
    EMPTY_CYLINDER_MAPPING,
    EMPTY_HANDLE_MAPPING,
    EMPTY_LOCK_MAPPING,
    EMPTY_LOCK_FORK_MAPPING,
    EMPTY_PACKAGING_MAPPING,
} from '@/services/mappings';
import {
    createDefaultConfigRepository,
    type ConfigRepository,
    type ConfigSource,
    type MappingKind,
} from '@/services/configRepository';
import type { CylinderMappingConfig, HandleMappingConfig, LockForkMappingConfig, LockMappingConfig, PackagingMappingConfig } from '@/types/mapping';

// Types for our configuration data
export interface MaterialCatalog {
    [key: string]: any;
}

export interface ColorFormulas {
    [key: string]: any;
}

export interface ConfigLoadSources {
    materials: ConfigSource;
    formulas: ConfigSource;
    cylinder: ConfigSource;
    lock: ConfigSource;
    lockFork: ConfigSource;
    packaging: ConfigSource;
    handle: ConfigSource;
}

export class ConfigLoaderService {
    private componentsMap: Record<string, any> = {};
    private materialCatalog: MaterialCatalog = {};
    private colorFormulas: ColorFormulas = {};
    private isLoaded = false;
    private loadSources: ConfigLoadSources = {
        materials: 'empty',
        formulas: 'empty',
        cylinder: 'empty',
        lock: 'empty',
        lockFork: 'empty',
        packaging: 'empty',
        handle: 'empty',
    };


    // New Configs
    private cylinderMapping: CylinderMappingConfig = EMPTY_CYLINDER_MAPPING;
    private lockMapping: LockMappingConfig = EMPTY_LOCK_MAPPING;
    private lockForkMapping: LockForkMappingConfig = EMPTY_LOCK_FORK_MAPPING;
    private packagingMapping: PackagingMappingConfig = EMPTY_PACKAGING_MAPPING;
    private handleMapping: HandleMappingConfig = EMPTY_HANDLE_MAPPING;

    constructor(private readonly repository: ConfigRepository = createDefaultConfigRepository()) {}

    async loadAll() {
        if (this.isLoaded) return;

        try {
            await Promise.all([
                this.loadMaterials(),
                this.loadCylinderMapping(),
                this.loadLockMapping(),
                this.loadLockForkMapping(),
                this.loadPackagingMapping(),
                this.loadHandleMapping()
            ]);
            try {
                await this.loadFormulas();
            } catch (e) {
                // Formula API can be temporarily unavailable; keep app usable with cached/empty formulas.
                console.warn('⚠️ loadFormulas failed during loadAll, continue with fallback formulas', e);
            }
            this.isLoaded = true;
        } catch (e) {
            console.error('❌ Failed to load configuration', e);
            throw e;
        }
    }

    async loadMaterials() {
        const result = await this.repository.readMaterials();
        this.materialCatalog = DataNormalizer.normalizeMaterialCatalog(result.payload as MaterialCatalog);
        this.loadSources.materials = result.source;
    }

    async loadFormulasFromRepository() {
        const result = await this.repository.readFormulas();
        this.colorFormulas = result.payload && typeof result.payload === 'object' ? result.payload : {};
        this.loadSources.formulas = result.source;
    }

    async loadFormulas() {
        await this.loadFormulasFromRepository();
    }

    private applyRuntimeMapping(kind: 'packaging' | 'cylinder' | 'lockFork' | 'handle' | 'lock', payload: unknown) {
        if (kind === 'packaging') {
            this.packagingMapping = adaptPackagingMapping(payload);
            return;
        }
        if (kind === 'cylinder') {
            this.cylinderMapping = adaptCylinderMapping(payload);
            return;
        }
        if (kind === 'lock') {
            this.lockMapping = adaptLockMapping(payload);
            return;
        }
        if (kind === 'handle') {
            this.handleMapping = adaptHandleMapping(payload);
            return;
        }
        this.lockForkMapping = adaptLockForkMapping(payload);
    }

    private async loadMapping(kind: MappingKind) {
        const result = await this.repository.readMapping(kind);
        this.loadSources[kind] = result.source;
        if (result.payload === null) {
            console.warn(`⚠️ load${kind}Mapping failed`);
            return;
        }
        this.applyRuntimeMapping(kind, result.payload);
    }

    async loadCylinderMapping() {
        await this.loadMapping('cylinder');
    }

    async loadLockForkMapping() {
        await this.loadMapping('lockFork');
    }

    async loadLockMapping() {
        await this.loadMapping('lock');
    }

    async loadPackagingMapping() {
        await this.loadMapping('packaging');
    }

    async loadHandleMapping() {
        await this.loadMapping('handle');
    }

    async refreshFormulas() {
        try {
            await this.loadFormulasFromRepository();
        } catch (e) {
            // Keep existing in-memory formulas as fallback.
            this.loadSources.formulas = 'memory';
            console.warn('⚠️ refreshFormulas failed, continue with cached formulas', e);
        }
    }

    async refreshMaterials() {
        await this.loadMaterials();
    }

    async refreshPackagingMapping() {
        await this.loadPackagingMapping();
    }

    async refreshCylinderMapping() {
        await this.loadCylinderMapping();
    }

    async refreshLockForkMapping() {
        await this.loadLockForkMapping();
    }

    async refreshLockMapping() {
        await this.loadLockMapping();
    }

    async refreshHandleMapping() {
        await this.loadHandleMapping();
    }

    getMaterials() { return this.materialCatalog; }
    getFormulas() { return this.colorFormulas; }
    getCylinderMapping() { return this.cylinderMapping; }
    getLockMapping() { return this.lockMapping; }
    getLockForkMapping() { return this.lockForkMapping; }
    getPackagingMapping() { return this.packagingMapping; }
    getHandleMapping() { return this.handleMapping; }
    getLoadSources() { return { ...this.loadSources }; }
}

export const configLoader = new ConfigLoaderService();
