
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
    type RuntimeConfigSnapshot,
} from '@/services/configRepository';
import type { CylinderMappingConfig, HandleMappingConfig, LockForkMappingConfig, LockMappingConfig, PackagingMappingConfig } from '@/types/mapping';
import type { SourceAnalysisConfig } from '@/types/sourceAnalysis';

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
    private runtimeVersion = '';
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

    private applyRuntimeSnapshot(snapshot: RuntimeConfigSnapshot, source: ConfigSource) {
        const profiles = (snapshot?.profiles || {}) as RuntimeConfigSnapshot['profiles'];
        if (!profiles.material_catalog || typeof profiles.material_catalog !== 'object') {
            throw new Error('Runtime config snapshot is missing material_catalog');
        }

        const requiredMappings: Array<{ key: keyof ConfigLoadSources; payload: unknown }> = [
            { key: 'packaging', payload: profiles.packaging },
            { key: 'cylinder', payload: profiles.cylinder },
            { key: 'lock', payload: profiles.lock },
            { key: 'handle', payload: profiles.handle },
            { key: 'lockFork', payload: profiles.lock_fork },
        ];
        for (const mapping of requiredMappings) {
            if (!mapping.payload || typeof mapping.payload !== 'object') {
                throw new Error(`Runtime config snapshot is missing ${mapping.key}`);
            }
        }

        this.materialCatalog = DataNormalizer.normalizeMaterialCatalog(profiles.material_catalog as MaterialCatalog);
        this.colorFormulas = profiles.formulas && typeof profiles.formulas === 'object'
            ? profiles.formulas
            : {};
        this.applyRuntimeMapping('packaging', profiles.packaging);
        this.applyRuntimeMapping('cylinder', profiles.cylinder);
        this.applyRuntimeMapping('lock', profiles.lock);
        this.applyRuntimeMapping('handle', profiles.handle);
        this.applyRuntimeMapping('lockFork', profiles.lock_fork);

        this.runtimeVersion = String(snapshot.version || '').trim();
        this.loadSources = {
            materials: source,
            formulas: source,
            cylinder: source,
            lock: source,
            lockFork: source,
            packaging: source,
            handle: source,
        };
    }

    private async tryLoadRuntimeSnapshot(): Promise<boolean> {
        if (typeof this.repository.readRuntimeSnapshot !== 'function') return false;

        try {
            const result = await this.repository.readRuntimeSnapshot();
            this.applyRuntimeSnapshot(result.payload, result.source);
            this.isLoaded = true;
            return true;
        } catch (error) {
            console.warn('⚠️ loadRuntimeSnapshot failed, falling back to granular config reads', error);
            return false;
        }
    }

    /**
     * Bootstrap runtime configuration before the app mounts.
     *
     * Contract:
     * - materials + published mappings are hard requirements; any failure aborts app bootstrap
     * - formulas are soft requirements; failures fall back to the last in-memory or empty map
     */
    async loadAll() {
        if (this.isLoaded) return;

        try {
            const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
            if (!loadedFromSnapshot) {
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
            // Published mapping payloads are fail-closed at runtime. A missing payload means
            // the corresponding business rule set is incomplete and bootstrap should stop.
            console.warn(`⚠️ load${kind}Mapping failed: missing published payload`);
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
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        try {
            await this.loadFormulasFromRepository();
        } catch (e) {
            // Keep existing in-memory formulas as fallback.
            this.loadSources.formulas = 'memory';
            console.warn('⚠️ refreshFormulas failed, continue with cached formulas', e);
        }
    }

    async refreshMaterials() {
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        await this.loadMaterials();
    }

    async refreshPackagingMapping() {
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        await this.loadPackagingMapping();
    }

    async refreshCylinderMapping() {
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        await this.loadCylinderMapping();
    }

    async refreshLockForkMapping() {
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        await this.loadLockForkMapping();
    }

    async refreshLockMapping() {
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        await this.loadLockMapping();
    }

    async refreshHandleMapping() {
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        await this.loadHandleMapping();
    }

    async refreshSourceAnalysisInputs() {
        const loadedFromSnapshot = await this.tryLoadRuntimeSnapshot();
        if (loadedFromSnapshot) return;
        await this.loadAll();
        await this.refreshMaterials();
        await this.refreshFormulas();
    }

    getSourceAnalysisConfig(): SourceAnalysisConfig {
        return {
            formulas: this.getFormulas(),
            materials: this.getMaterials(),
            cylinderMapping: this.getCylinderMapping(),
            lockMapping: this.getLockMapping(),
            handleMapping: this.getHandleMapping(),
            lockForkMapping: this.getLockForkMapping(),
            packagingMapping: this.getPackagingMapping(),
        };
    }

    getMaterials() { return this.materialCatalog; }
    getFormulas() { return this.colorFormulas; }
    getCylinderMapping() { return this.cylinderMapping; }
    getLockMapping() { return this.lockMapping; }
    getLockForkMapping() { return this.lockForkMapping; }
    getPackagingMapping() { return this.packagingMapping; }
    getHandleMapping() { return this.handleMapping; }
    getRuntimeVersion() { return this.runtimeVersion; }
    getLoadSources() { return { ...this.loadSources }; }
}

export const configLoader = new ConfigLoaderService();
