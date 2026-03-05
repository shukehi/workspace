
import { DataNormalizer } from '@/lib/erp-engine/dataNormalizer';
import { api } from '@/lib/api';

// Types for our configuration data
export interface MaterialCatalog {
    [key: string]: any;
}

export interface ColorFormulas {
    [key: string]: any;
}

class ConfigLoaderService {
    private componentsMap: Record<string, any> = {};
    private materialCatalog: MaterialCatalog = {};
    private colorFormulas: ColorFormulas = {};
    private isLoaded = false;


    // New Configs
    private cylinderMapping: any = {};
    private lockForkMapping: any = {};
    private packagingMapping: any = {};

    async loadAll() {
        if (this.isLoaded) return;

        try {
            await Promise.all([
                this.loadMaterials(),
                this.loadCylinderMapping(),
                this.loadLockForkMapping(),
                this.loadPackagingMapping()
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
        const res = await fetch('/data/materials-catalog.json');
        if (!res.ok) throw new Error('Failed to load materials catalog');
        const raw = await res.json();
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

    async loadCylinderMapping() {
        const res = await fetch('/data/cylinder-mapping.json');
        if (!res.ok) console.warn('⚠️ loadCylinderMapping failed'); // Optional
        else this.cylinderMapping = await res.json();
    }

    async loadLockForkMapping() {
        const res = await fetch('/data/lock-fork-mapping.json');
        if (!res.ok) console.warn('⚠️ loadLockForkMapping failed');
        else this.lockForkMapping = await res.json();
    }

    async loadPackagingMapping() {
        const res = await fetch('/data/packaging-mapping.json');
        if (!res.ok) console.warn('⚠️ loadPackagingMapping failed');
        else this.packagingMapping = await res.json();
    }

    getMaterials() { return this.materialCatalog; }
    getFormulas() { return this.colorFormulas; }
    getCylinderMapping() { return this.cylinderMapping; }
    getLockForkMapping() { return this.lockForkMapping; }
    getPackagingMapping() { return this.packagingMapping; }
}

export const configLoader = new ConfigLoaderService();
