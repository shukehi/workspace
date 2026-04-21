import crypto from 'node:crypto';
import * as MappingService from '../mappings';
import * as MaterialCatalogService from '../materials';
import * as FormulaService from '../formulas';

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
    throw new Error(`Missing mapping profile: ${profileCode}`);
  }
  if (!detail.ok) {
    throw new Error(extractErrorMessage(detail, `Failed to read mapping profile: ${profileCode}`));
  }

  const payload = detail.mapping?.publishedPayload;
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Missing published mapping payload for ${profileCode}`);
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

  const [materials, packaging, cylinder, lock, handle, lockFork] = await Promise.all([
    readPublishedMaterialsCatalog(),
    readPublishedMapping('packaging'),
    readPublishedMapping('cylinder'),
    readPublishedMapping('lock'),
    readPublishedMapping('handle'),
    readPublishedMapping('lock_fork'),
  ]);

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
