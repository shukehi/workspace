import crypto from 'node:crypto';
import * as MappingService from '../mappings';
import * as MaterialCatalogService from '../materials';
import * as FormulaService from '../formulas';
import { normalizeRuntimeDegradedProfiles } from './profile.runtime-readiness';

type MappingProfileCode = 'packaging' | 'cylinder' | 'lock' | 'handle' | 'lock_fork';

type RevisionMetaLike = {
  revision?: number | null;
  createdAt?: string | null;
};

type RuntimeConfigSnapshot = {
  version: string;
  publishedAt: string;
  profiles: {
    material_catalog: Record<string, unknown>;
    formulas: Record<string, unknown>;
    packaging: Record<string, unknown>;
    cylinder: Record<string, unknown>;
    lock: Record<string, unknown>;
    handle: Record<string, unknown>;
    lock_fork: Record<string, unknown>;
  };
  meta: {
    revisions: {
      material_catalog: number | null;
      formulas: number | null;
      packaging: number | null;
      cylinder: number | null;
      lock: number | null;
      handle: number | null;
      lock_fork: number | null;
    };
    degradedProfiles: string[];
  };
};

type PublishedProfilePayload = {
  payload: Record<string, unknown>;
  revision: number | null;
  publishedAt: string | null;
};

const REQUIRED_MAPPING_PROFILE_CODES: MappingProfileCode[] = ['packaging', 'cylinder', 'lock', 'handle', 'lock_fork'];

class RuntimeProfileUnavailableError extends Error {
  readonly profileCode: MappingProfileCode;

  constructor(profileCode: MappingProfileCode, message: string) {
    super(message);
    this.name = 'RuntimeProfileUnavailableError';
    this.profileCode = profileCode;
  }
}

export class RuntimeConfigSnapshotNotReadyError extends Error {
  readonly degradedProfiles: string[];

  constructor(failures: Array<{ profileCode: MappingProfileCode; message: string }>) {
    const degradedProfiles = normalizeRuntimeDegradedProfiles(failures.map((failure) => failure.profileCode));
    super(
      failures.length === 1
        ? failures[0].message
        : `Missing required published mapping profiles: ${degradedProfiles.join(', ')}`,
    );
    this.name = 'RuntimeConfigSnapshotNotReadyError';
    this.degradedProfiles = degradedProfiles;
  }
}

function toRevisionNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function normalizeTimestamp(value: unknown): string | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function computePublishedAt(candidates: Array<string | null>): string {
  const timestamps = candidates
    .filter((item): item is string => typeof item === 'string' && item.length > 0)
    .map((item) => new Date(item).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return new Date(0).toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function buildVersion(input: { profiles: RuntimeConfigSnapshot['profiles']; revisions: RuntimeConfigSnapshot['meta']['revisions']; degradedProfiles: string[] }) {
  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 12);

  return `cfg-${hash}`;
}

function extractErrorMessage(error: unknown, fallback: string) {
  const record = (error || {}) as { message?: string; errors?: Array<{ message?: string; field?: string }> };
  const firstIssue = Array.isArray(record.errors) ? record.errors.find((item) => item?.message)?.message : '';
  return firstIssue || record.message || fallback;
}

async function readPublishedMapping(profileCode: MappingProfileCode) {
  const detail = await MappingService.getMappingDetail(profileCode);
  if (!detail) {
    throw new RuntimeProfileUnavailableError(profileCode, `Missing mapping profile: ${profileCode}`);
  }
  if (!detail.ok) {
    throw new RuntimeProfileUnavailableError(profileCode, extractErrorMessage(detail, `Failed to read mapping profile: ${profileCode}`));
  }

  const payload = detail.mapping?.publishedPayload;
  if (!payload || typeof payload !== 'object') {
    throw new RuntimeProfileUnavailableError(profileCode, `Missing published mapping payload for ${profileCode}`);
  }

  const publishedRevision = (detail.mapping?.publishedRevision || null) as RevisionMetaLike | null;

  return {
    payload: payload as Record<string, unknown>,
    revision: toRevisionNumber(publishedRevision?.revision),
    publishedAt: normalizeTimestamp(publishedRevision?.createdAt),
  };
}

async function readPublishedMaterialsCatalog() {
  const detail = await MaterialCatalogService.getMaterialsCatalogDetail();
  const payload = await MaterialCatalogService.getPublishedMaterialsCatalog();
  const publishedRevision = (detail?.publishedRevision || null) as RevisionMetaLike | null;

  return {
    payload: (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>,
    revision: toRevisionNumber(publishedRevision?.revision),
    publishedAt: normalizeTimestamp(publishedRevision?.createdAt),
  };
}

async function readPublishedFormulasMap() {
  return await FormulaService.getPublishedFormulasMap();
}

export async function buildRuntimeConfigSnapshot(): Promise<RuntimeConfigSnapshot> {
  const degradedProfiles: string[] = [];

  const [materials, mappingResults] = await Promise.all([
    readPublishedMaterialsCatalog(),
    Promise.allSettled(REQUIRED_MAPPING_PROFILE_CODES.map((profileCode) => readPublishedMapping(profileCode))),
  ]);

  const mappingFailures = mappingResults
    .map((result, index) => ({ result, profileCode: REQUIRED_MAPPING_PROFILE_CODES[index] }))
    .filter((item): item is { result: PromiseRejectedResult; profileCode: MappingProfileCode } => item.result.status === 'rejected')
    .map(({ result, profileCode }) => ({
      profileCode: result.reason instanceof RuntimeProfileUnavailableError
        ? result.reason.profileCode
        : profileCode,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason || `Missing mapping profile: ${profileCode}`),
    }));

  if (mappingFailures.length > 0) {
    throw new RuntimeConfigSnapshotNotReadyError(mappingFailures);
  }

  const [packaging, cylinder, lock, handle, lockFork] = mappingResults
    .map((result) => (result as PromiseFulfilledResult<PublishedProfilePayload>).value) as [
      PublishedProfilePayload,
      PublishedProfilePayload,
      PublishedProfilePayload,
      PublishedProfilePayload,
      PublishedProfilePayload,
    ];

  let formulasPayload: Record<string, unknown> = {};
  try {
    const candidate = await readPublishedFormulasMap();
    formulasPayload = candidate && typeof candidate === 'object' ? candidate as Record<string, unknown> : {};
  } catch (error) {
    degradedProfiles.push('formulas');
    console.warn('[runtime-config] published formulas map degraded to empty payload', error);
  }

  const revisions: RuntimeConfigSnapshot['meta']['revisions'] = {
    material_catalog: materials.revision,
    formulas: null,
    packaging: packaging.revision,
    cylinder: cylinder.revision,
    lock: lock.revision,
    handle: handle.revision,
    lock_fork: lockFork.revision,
  };

  const profiles: RuntimeConfigSnapshot['profiles'] = {
    material_catalog: materials.payload,
    formulas: formulasPayload,
    packaging: packaging.payload,
    cylinder: cylinder.payload,
    lock: lock.payload,
    handle: handle.payload,
    lock_fork: lockFork.payload,
  };

  const publishedAt = computePublishedAt([
    materials.publishedAt,
    packaging.publishedAt,
    cylinder.publishedAt,
    lock.publishedAt,
    handle.publishedAt,
    lockFork.publishedAt,
  ]);

  return {
    version: buildVersion({ profiles, revisions, degradedProfiles }),
    publishedAt,
    profiles,
    meta: {
      revisions,
      degradedProfiles,
    },
  };
}
