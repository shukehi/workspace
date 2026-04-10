export type ConfigSource = 'api' | 'static' | 'memory' | 'empty';
export type MappingKind = 'packaging' | 'cylinder' | 'lockFork' | 'handle' | 'lock';

export interface ConfigReadResult<T> {
    payload: T;
    source: ConfigSource;
}

export interface ConfigRepository {
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

    async readMaterials(): Promise<ConfigReadResult<unknown>> {
        const workflowPayload = await this.fetchJson('/api/config/material-catalog/published');
        if (workflowPayload !== null) {
            return { payload: workflowPayload, source: 'api' };
        }

        const apiPayload = await this.fetchJson('/api/config/materials');
        if (apiPayload !== null) {
            return { payload: apiPayload, source: 'api' };
        }

        const staticPayload = await this.fetchJson('/data/materials-catalog.json');
        if (staticPayload === null) {
            throw new Error('Failed to load materials catalog');
        }

        return { payload: staticPayload, source: 'static' };
    }

    async readFormulas(): Promise<ConfigReadResult<Record<string, any>>> {
        const { api } = await import('@/lib/api');
        const payload = await api.get<Record<string, any>>('/config/formulas/published-map');
        return {
            payload: payload && typeof payload === 'object' ? payload : {},
            source: 'api',
        };
    }

    async readMapping(kind: MappingKind): Promise<ConfigReadResult<unknown>> {
        const workflowType = kind === 'lockFork' ? 'lock_fork' : kind;
        const workflowPublishedPath = `/api/config/mappings/${workflowType}/published`;
        const workflowPayload = await this.fetchJson(workflowPublishedPath);
        if (workflowPayload !== null) {
            return { payload: workflowPayload, source: 'api' };
        }
        throw new Error(`Failed to load published mapping for ${workflowType}`);
    }
}

export function createDefaultConfigRepository(): ConfigRepository {
    return new ApiWithStaticFallbackConfigRepository();
}
