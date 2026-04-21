export type ConfigSource = 'api' | 'static' | 'memory' | 'empty';
export type MappingKind = 'packaging' | 'cylinder' | 'lockFork' | 'handle' | 'lock';

export interface RuntimeConfigSnapshot {
    version: string;
    publishedAt: string;
    profiles: {
        material_catalog: Record<string, unknown>;
        formulas: Record<string, any>;
        packaging: unknown;
        cylinder: unknown;
        lock: unknown;
        handle: unknown;
        lock_fork: unknown;
    };
    meta?: {
        revisions?: Record<string, number | null>;
        degradedProfiles?: string[];
    };
}

export interface ConfigReadResult<T> {
    payload: T;
    source: ConfigSource;
}

export interface ConfigRepository {
    readRuntimeSnapshot?(): Promise<ConfigReadResult<RuntimeConfigSnapshot>>;
    readMaterials(): Promise<ConfigReadResult<unknown>>;
    readFormulas(): Promise<ConfigReadResult<Record<string, any>>>;
    readMapping(kind: MappingKind): Promise<ConfigReadResult<unknown>>;
}

type FetchJson = (url: string) => Promise<unknown | null>;

async function defaultFetchJson(url: string) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.warn(`⚠️ fetchJson failed for ${url}`, error);
        return null;
    }
}

export class ApiWithStaticFallbackConfigRepository implements ConfigRepository {
    constructor(private readonly fetchJson: FetchJson = defaultFetchJson) {}

    async readRuntimeSnapshot(): Promise<ConfigReadResult<RuntimeConfigSnapshot>> {
        const snapshotPayload = await this.fetchJson('/api/runtime/config-snapshot');
        if (snapshotPayload === null) {
            throw new Error('Failed to load runtime config snapshot');
        }

        return {
            payload: snapshotPayload as RuntimeConfigSnapshot,
            source: 'api',
        };
    }

    private extractDetailPublishedPayload<T>(payload: unknown): T | null {
        if (!payload || typeof payload !== 'object') return null;
        const detail = (payload as { detail?: { publishedPayload?: T } }).detail;
        const publishedPayload = detail?.publishedPayload;
        return publishedPayload && typeof publishedPayload === 'object'
            ? publishedPayload
            : null;
    }

    async readMaterials(): Promise<ConfigReadResult<unknown>> {
        const profileDetailPayload = await this.fetchJson('/api/config/profiles/material_catalog/detail');
        const workflowPayload = this.extractDetailPublishedPayload(profileDetailPayload);
        if (workflowPayload !== null) {
            return { payload: workflowPayload, source: 'api' };
        }

        const staticPayload = await this.fetchJson('/data/materials-catalog.json');
        if (staticPayload === null) {
            throw new Error('Failed to load materials catalog');
        }

        return { payload: staticPayload, source: 'static' };
    }

    async readFormulas(): Promise<ConfigReadResult<Record<string, any>>> {
        const profilePayload = await this.fetchJson('/api/config/profiles/formulas/detail');
        const payload = profilePayload && typeof profilePayload === 'object'
            ? (profilePayload as { detail?: { publishedPayload?: Record<string, any> } }).detail?.publishedPayload
            : null;
        return {
            payload: payload && typeof payload === 'object' ? payload : {},
            source: payload && typeof payload === 'object' ? 'api' : 'empty',
        };
    }

    async readMapping(kind: MappingKind): Promise<ConfigReadResult<unknown>> {
        const workflowType = kind === 'lockFork' ? 'lock_fork' : kind;
        const workflowDetailPath = `/api/config/profiles/${workflowType}/detail`;
        const workflowPayload = this.extractDetailPublishedPayload(await this.fetchJson(workflowDetailPath));
        if (workflowPayload !== null) {
            return { payload: workflowPayload, source: 'api' };
        }
        throw new Error(`Failed to load published mapping for ${workflowType}`);
    }
}

export function createDefaultConfigRepository(): ConfigRepository {
    return new ApiWithStaticFallbackConfigRepository();
}
