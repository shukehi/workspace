export type ConfigSource = 'api' | 'static' | 'memory' | 'empty';
export type MappingKind = 'packaging' | 'cylinder' | 'lockFork' | 'handle';

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

const STATIC_MAPPING_PATHS: Record<Exclude<MappingKind, 'packaging'>, string> = {
    cylinder: '/data/cylinder-mapping.json',
    lockFork: '/data/lock-fork-mapping.json',
    handle: '/data/handle-mapping.json',
};

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

        const apiPath = `/api/config/${kind === 'lockFork' ? 'lock-fork' : kind}`;
        const apiPayload = await this.fetchJson(apiPath);
        if (apiPayload !== null) {
            return { payload: apiPayload, source: 'api' };
        }

        if (kind === 'packaging') {
            const staticPayload = await this.fetchJson('/data/packaging-mapping.json');
            if (staticPayload === null) {
                return { payload: null, source: 'empty' };
            }
            return { payload: staticPayload, source: 'static' };
        }

        const staticPayload = await this.fetchJson(STATIC_MAPPING_PATHS[kind]);
        if (staticPayload === null) {
            return { payload: null, source: 'empty' };
        }
        return { payload: staticPayload, source: 'static' };
    }
}

export function createDefaultConfigRepository(): ConfigRepository {
    return new ApiWithStaticFallbackConfigRepository();
}
