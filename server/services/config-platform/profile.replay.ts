import fs from 'node:fs';
import path from 'node:path';
import { analyzeSourceOrder } from '@/services/sourceAnalysis';
import { buildRuntimeConfigSnapshot } from './profile.snapshot';
import { runtimeNotReady, runtimeReady, type RuntimeReadiness } from './profile.runtime-readiness';
import { getConfigProfileDefinition } from './profile.registry';
import { getConfigProfileDetail } from './profile.service';
import { ErpContract } from '../../models';
import { getCurrentFormulaWorkingMap, getPublishedFormulaMap } from './formulas.collection';

type ReplaySummary = {
  counts: {
    materials: number;
    cylinders: number;
    locks: number;
    handles: number;
    lockForks: number;
    accessories: number;
    packaging: number;
  };
  changedSections: string[];
};

export type ConfigProfileReplayItem = {
  id: string;
  label: string;
  changed: boolean;
  before: ReplaySummary;
  after: ReplaySummary;
};

export type ConfigProfileReplayResult = {
  profileCode: string;
  supported: boolean;
  sampleSource: 'contract-cache' | 'fixtures';
  sampleCount: number;
  changedSampleCount: number;
  items: ConfigProfileReplayItem[];
  runtimeReadiness?: RuntimeReadiness;
  runtimeNotReady?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function summarizeAnalysis(result: any): ReplaySummary {
  const materials = Array.isArray(result?.flatMaterials) ? result.flatMaterials : [];
  const cylinders = Array.isArray(result?.flatCylinders) ? result.flatCylinders : [];
  const locks = Array.isArray(result?.flatLocks) ? result.flatLocks : [];
  const handles = Array.isArray(result?.flatHandles) ? result.flatHandles : [];
  const lockForks = Array.isArray(result?.flatForks) ? result.flatForks : [];
  const accessories = Array.isArray(result?.flatAccessories) ? result.flatAccessories : [];
  const packaging = Array.isArray(result?.flatPackaging) ? result.flatPackaging : [];

  const signatures = {
    materials: materials.map(stableStringify).sort(),
    cylinders: cylinders.map(stableStringify).sort(),
    locks: locks.map(stableStringify).sort(),
    handles: handles.map(stableStringify).sort(),
    lockForks: lockForks.map(stableStringify).sort(),
    accessories: accessories.map(stableStringify).sort(),
    packaging: packaging.map(stableStringify).sort(),
  };

  return {
    counts: {
      materials: materials.length,
      cylinders: cylinders.length,
      locks: locks.length,
      handles: handles.length,
      lockForks: lockForks.length,
      accessories: accessories.length,
      packaging: packaging.length,
    },
    changedSections: Object.entries(signatures)
      .filter(([, value]) => Array.isArray(value) && value.length > 0)
      .map(([key]) => key),
  };
}

function compareSummaries(before: ReplaySummary, after: ReplaySummary) {
  const changedSections = new Set<string>();
  for (const key of Object.keys(before.counts) as Array<keyof ReplaySummary['counts']>) {
    if (before.counts[key] !== after.counts[key]) {
      changedSections.add(key);
    }
  }
  for (const key of after.changedSections) changedSections.add(key);
  for (const key of before.changedSections) changedSections.add(key);
  return [...changedSections].sort();
}

function loadFixtureSamples() {
  const fixturePath = path.join(process.cwd(), 'tests/fixtures/mapping-runtime-baseline.derived-cases.json');
  const raw = fs.readFileSync(fixturePath, 'utf8');
  const parsed = JSON.parse(raw) as { cases?: Array<{ id?: string; sample?: any }> };
  return Array.isArray(parsed.cases)
    ? parsed.cases
        .map((item) => ({ id: String(item?.id || ''), sample: item?.sample }))
        .filter((item) => item.id && item.sample)
    : [];
}

async function loadContractCacheSamples(limit = 5) {
  const rows = await ErpContract.findAll({
    order: [['last_fetched_at', 'DESC']],
    limit,
  }) as Array<{ get?: (opts?: { plain?: boolean }) => any; raw_json?: unknown; contract_code?: string }>;

  return rows
    .map((row) => {
      const plain = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
      const raw = plain?.raw_json;
      const list = Array.isArray(raw?.list) ? raw.list : [];
      if (!raw || !Array.isArray(list) || list.length === 0) return null;
      return {
        id: String(plain?.contract_code || raw?.code || ''),
        sample: raw,
      };
    })
    .filter((item): item is { id: string; sample: any } => Boolean(item && item.id && item.sample));
}

function profilesToAnalysisConfig(profiles: Record<string, unknown>) {
  return {
    formulas: isPlainObject(profiles.formulas) ? profiles.formulas : {},
    materials: isPlainObject(profiles.material_catalog) ? profiles.material_catalog : {},
    cylinderMapping: isPlainObject(profiles.cylinder) ? profiles.cylinder : {},
    lockMapping: isPlainObject(profiles.lock) ? profiles.lock : {},
    handleMapping: isPlainObject(profiles.handle) ? profiles.handle : {},
    lockForkMapping: isPlainObject(profiles.lock_fork) ? profiles.lock_fork : {},
    packagingMapping: isPlainObject(profiles.packaging) ? profiles.packaging : {},
  };
}

function createEmptyProfiles() {
  return {
    material_catalog: {},
    formulas: {},
    packaging: {},
    cylinder: {},
    lock: {},
    handle: {},
    lock_fork: {},
  } as Record<string, unknown>;
}

function applyProfileOverride(code: string, profiles: Record<string, unknown>, payload: Record<string, unknown>) {
  const next = { ...profiles };
  if (code === 'material_catalog') {
    next.material_catalog = payload;
  } else if (code === 'lock_fork') {
    next.lock_fork = payload;
  } else {
    next[code] = payload;
  }
  return next;
}

export async function getConfigProfileReplay(code: string): Promise<{ ok: boolean; status?: number; errors?: Array<{ field: string; code?: string; message: string }>; replay?: ConfigProfileReplayResult }> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) {
    return {
      ok: false,
      status: 404,
      errors: [{ field: 'code', code: 'not-found', message: `Config profile not found: ${code}` }],
    };
  }

  if (code === 'formulas') {
    const [publishedMap, workingMap] = await Promise.all([
      getPublishedFormulaMap(),
      getCurrentFormulaWorkingMap(),
    ]);
    const beforeProfiles = createEmptyProfiles();
    beforeProfiles.formulas = publishedMap;
    const afterProfiles = createEmptyProfiles();
    afterProfiles.formulas = workingMap;
    const beforeConfig = profilesToAnalysisConfig(beforeProfiles);
    const afterConfig = profilesToAnalysisConfig(afterProfiles);
    const contractSamples = await loadContractCacheSamples();
    const sampleSource = contractSamples.length > 0 ? 'contract-cache' : 'fixtures';
    const sourceSamples = contractSamples.length > 0 ? contractSamples : loadFixtureSamples();
    const items: ConfigProfileReplayItem[] = sourceSamples.map((sample) => {
      const beforeResult = analyzeSourceOrder({ order: sample.sample, config: beforeConfig });
      const afterResult = analyzeSourceOrder({ order: sample.sample, config: afterConfig });
      const before = summarizeAnalysis(beforeResult);
      const after = summarizeAnalysis(afterResult);
      const changedSections = compareSummaries(before, after);
      return {
        id: sample.id,
        label: sample.id,
        changed: changedSections.length > 0,
        before: { ...before, changedSections },
        after: { ...after, changedSections },
      };
    });
    return {
      ok: true,
      replay: {
        profileCode: code,
        supported: true,
        sampleSource,
        sampleCount: items.length,
        changedSampleCount: items.filter((item) => item.changed).length,
        items,
      },
    };
  }

  if (definition.workflowKind !== 'singleton') {
    return {
      ok: false,
      status: 405,
      errors: [{ field: 'replay', code: 'unsupported', message: `${code} does not support replay` }],
    };
  }

  const detailResult = await getConfigProfileDetail(code);
  if (!detailResult.ok || !detailResult.detail) {
    return {
      ok: false,
      status: detailResult.status,
      errors: detailResult.errors,
    };
  }

  const detail = detailResult.detail;
  let beforeProfiles: Record<string, unknown> = createEmptyProfiles();
  let runtimeReadiness: RuntimeReadiness = runtimeReady();
  try {
    const snapshot = await buildRuntimeConfigSnapshot();
    beforeProfiles = snapshot.profiles as Record<string, unknown>;
    runtimeReadiness = runtimeReady(snapshot.meta?.degradedProfiles);
  } catch (error) {
    runtimeReadiness = runtimeNotReady(error);
    console.warn('[profile-replay] runtime snapshot unavailable, falling back to empty baseline profiles', error);
  }

  const draftPayload = (detail.draftPayload || detail.publishedPayload || {}) as Record<string, unknown>;
  const publishedPayload = (detail.publishedPayload || {}) as Record<string, unknown>;
  beforeProfiles = applyProfileOverride(code, beforeProfiles, publishedPayload);
  const afterProfiles = applyProfileOverride(code, beforeProfiles, draftPayload);
  const beforeConfig = profilesToAnalysisConfig(beforeProfiles);
  const afterConfig = profilesToAnalysisConfig(afterProfiles);

  const contractSamples = await loadContractCacheSamples();
  const sampleSource = contractSamples.length > 0 ? 'contract-cache' : 'fixtures';
  const sourceSamples = contractSamples.length > 0 ? contractSamples : loadFixtureSamples();

  const items: ConfigProfileReplayItem[] = sourceSamples.map((sample) => {
    const beforeResult = analyzeSourceOrder({ order: sample.sample, config: beforeConfig });
    const afterResult = analyzeSourceOrder({ order: sample.sample, config: afterConfig });
    const before = summarizeAnalysis(beforeResult);
    const after = summarizeAnalysis(afterResult);
    const changedSections = compareSummaries(before, after);
    return {
      id: sample.id,
      label: sample.id,
      changed: changedSections.length > 0,
      before: {
        ...before,
        changedSections,
      },
      after: {
        ...after,
        changedSections,
      },
    };
  });

  return {
    ok: true,
    replay: {
      profileCode: code,
      supported: true,
      sampleSource,
      sampleCount: items.length,
      changedSampleCount: items.filter((item) => item.changed).length,
      items,
      runtimeReadiness,
      runtimeNotReady: runtimeReadiness.runtimeNotReady,
    },
  };
}
