
import { normalizeMaterialCatalog } from '@/lib/legacy/facade';

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
            console.log('🔄 Loading configuration...');
            await Promise.all([
                this.loadMaterials(),
                this.loadFormulas(),
                this.loadCylinderMapping(),
                this.loadLockForkMapping(),
                this.loadPackagingMapping()
            ]);
            this.isLoaded = true;
            console.log('✅ Configuration loaded successfully');
        } catch (e) {
            console.error('❌ Failed to load configuration', e);
            throw e;
        }
    }

    async loadMaterials() {
        const res = await fetch('/data/materials-catalog.json');
        if (!res.ok) throw new Error('Failed to load materials catalog');
        const raw = await res.json();
        this.materialCatalog = normalizeMaterialCatalog(raw);
    }

    async loadFormulas() {
        const res = await fetch('/data/color-formulas.json');
        if (!res.ok) throw new Error('Failed to load color formulas');
        this.colorFormulas = await res.json();
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
