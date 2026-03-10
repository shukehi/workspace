
import { DataNormalizer } from '@/lib/erp-engine/dataNormalizer';
import { api } from '@/lib/api';
import {
    adaptCylinderMapping,
    adaptHandleMapping,
    adaptLockForkMapping,
    adaptPackagingMapping,
    EMPTY_CYLINDER_MAPPING,
    EMPTY_HANDLE_MAPPING,
    EMPTY_LOCK_FORK_MAPPING,
    EMPTY_PACKAGING_MAPPING,
} from '@/services/mappings';
import type { CylinderMappingConfig, HandleMappingConfig, LockForkMappingConfig, PackagingMappingConfig } from '@/types/mapping';

// Types for our configuration data
export interface MaterialCatalog {
    [key: string]: any;
}

export interface ColorFormulas {
    [key: string]: any;
}

export class ConfigLoaderService {
    private componentsMap: Record<string, any> = {};
    private materialCatalog: MaterialCatalog = {};
    private colorFormulas: ColorFormulas = {};
    private isLoaded = false;


    // New Configs
    private cylinderMapping: CylinderMappingConfig = EMPTY_CYLINDER_MAPPING;
    private lockForkMapping: LockForkMappingConfig = EMPTY_LOCK_FORK_MAPPING;
    private packagingMapping: PackagingMappingConfig = EMPTY_PACKAGING_MAPPING;
    private handleMapping: HandleMappingConfig = EMPTY_HANDLE_MAPPING;

    async loadAll() {
        if (this.isLoaded) return;

        try {
            await Promise.all([
                this.loadMaterials(),
                this.loadCylinderMapping(),
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
        const apiPayload = await this.fetchJson('/api/config/materials');
        if (apiPayload !== null) {
            this.materialCatalog = DataNormalizer.normalizeMaterialCatalog(apiPayload);
            return;
        }

        const raw = await this.fetchJson('/data/materials-catalog.json');
        if (raw === null) throw new Error('Failed to load materials catalog');
        this.materialCatalog = DataNormalizer.normalizeMaterialCatalog(raw);
    }

    async loadFormulasFromApi() {
        const formulas = await api.get<Record<string, any>>('/config/formulas/published-map');
        this.colorFormulas = formulas && typeof formulas === 'object' ? formulas : {};
    }

    async loadFormulas() {
        await this.loadFormulasFromApi();
    }

    async refreshFormulas() {
        try {
            await this.loadFormulasFromApi();
        } catch (e) {
            // Keep existing in-memory formulas as fallback.
            console.warn('⚠️ refreshFormulas failed, continue with cached formulas', e);
        }
    }

    private async fetchJson(url: string) {
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            console.warn(`⚠️ fetchJson failed for ${url}`, error);
            return null;
        }
    }

    private applyRuntimeMapping(kind: 'packaging' | 'cylinder' | 'lockFork' | 'handle', payload: unknown) {
        if (kind === 'packaging') {
            this.packagingMapping = adaptPackagingMapping(payload);
            return;
        }
        if (kind === 'cylinder') {
            this.cylinderMapping = adaptCylinderMapping(payload);
            return;
        }
        if (kind === 'handle') {
            this.handleMapping = adaptHandleMapping(payload);
            return;
        }
        this.lockForkMapping = adaptLockForkMapping(payload);
    }

    private async loadStaticRuntimeMapping(kind: 'cylinder' | 'lockFork' | 'handle', url: string, warningMessage: string) {
        const payload = await this.fetchJson(url);
        if (payload === null) {
            console.warn(warningMessage);
            return;
        }
        this.applyRuntimeMapping(kind, payload);
    }

    async loadCylinderMapping() {
        const apiPayload = await this.fetchJson('/api/config/cylinder');
        if (apiPayload !== null) {
            this.applyRuntimeMapping('cylinder', apiPayload);
            return;
        }

        await this.loadStaticRuntimeMapping('cylinder', '/data/cylinder-mapping.json', '⚠️ loadCylinderMapping failed');
    }

    async loadLockForkMapping() {
        const apiPayload = await this.fetchJson('/api/config/lock-fork');
        if (apiPayload !== null) {
            this.applyRuntimeMapping('lockFork', apiPayload);
            return;
        }

        await this.loadStaticRuntimeMapping('lockFork', '/data/lock-fork-mapping.json', '⚠️ loadLockForkMapping failed');
    }

    async loadPackagingMapping() {
        const apiPayload = await this.fetchJson('/api/config/packaging');
        if (apiPayload !== null) {
            this.applyRuntimeMapping('packaging', apiPayload);
            return;
        }

        // One-time fallback to static file for environments where config API is unavailable.
        const staticPayload = await this.fetchJson('/data/packaging-mapping.json');
        if (staticPayload === null) {
            console.warn('⚠️ loadPackagingMapping failed');
            return;
        }
        this.applyRuntimeMapping('packaging', staticPayload);
    }

    async loadHandleMapping() {
        const apiPayload = await this.fetchJson('/api/config/handle');
        if (apiPayload !== null) {
            this.applyRuntimeMapping('handle', apiPayload);
            return;
        }

        await this.loadStaticRuntimeMapping('handle', '/data/handle-mapping.json', '⚠️ loadHandleMapping failed');
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

    async refreshHandleMapping() {
        await this.loadHandleMapping();
    }

    getMaterials() { return this.materialCatalog; }
    getFormulas() { return this.colorFormulas; }
    getCylinderMapping() { return this.cylinderMapping; }
    getLockForkMapping() { return this.lockForkMapping; }
    getPackagingMapping() { return this.packagingMapping; }
    getHandleMapping() { return this.handleMapping; }
}

export const configLoader = new ConfigLoaderService();
