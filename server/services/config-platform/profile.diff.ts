import { getConfigProfileDefinition } from './profile.registry';
import { getConfigProfileDetail } from './profile.service';
import { getCurrentFormulaWorkingMap, getPublishedFormulaMap } from './formulas.collection';

type DiffKind = 'added' | 'removed' | 'changed';

export type ConfigProfileDiffItem = {
  path: string;
  kind: DiffKind;
  before?: unknown;
  after?: unknown;
};

export type ConfigProfileDiffResult = {
  profileCode: string;
  supported: boolean;
  draftRevision: number | null;
  publishedRevision: number | null;
  hasChanges: boolean;
  items: ConfigProfileDiffItem[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function appendPath(base: string, key: string) {
  return base ? `${base}.${key}` : key;
}

function diffValues(before: unknown, after: unknown, path: string, into: ConfigProfileDiffItem[]) {
  if (before === after) return;

  if (Array.isArray(before) && Array.isArray(after)) {
    const beforeJson = JSON.stringify(before);
    const afterJson = JSON.stringify(after);
    if (beforeJson !== afterJson) {
      into.push({ path, kind: 'changed', before, after });
    }
    return;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of [...keys].sort()) {
      const nextPath = appendPath(path, key);
      if (!(key in before)) {
        into.push({ path: nextPath, kind: 'added', after: after[key] });
        continue;
      }
      if (!(key in after)) {
        into.push({ path: nextPath, kind: 'removed', before: before[key] });
        continue;
      }
      diffValues(before[key], after[key], nextPath, into);
    }
    return;
  }

  if (before === undefined) {
    into.push({ path, kind: 'added', after });
    return;
  }
  if (after === undefined) {
    into.push({ path, kind: 'removed', before });
    return;
  }
  into.push({ path, kind: 'changed', before, after });
}

export async function getConfigProfileDiff(code: string): Promise<{ ok: boolean; status?: number; errors?: Array<{ field: string; code?: string; message: string }>; diff?: ConfigProfileDiffResult }> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) {
    return {
      ok: false,
      status: 404,
      errors: [{ field: 'code', code: 'not-found', message: `Config profile not found: ${code}` }],
    };
  }

  if (code === 'formulas') {
    const before = await getPublishedFormulaMap();
    const after = await getCurrentFormulaWorkingMap();
    const items: ConfigProfileDiffItem[] = [];
    diffValues(before, after, 'formulas', items);
    return {
      ok: true,
      diff: {
        profileCode: code,
        supported: true,
        draftRevision: null,
        publishedRevision: null,
        hasChanges: items.length > 0,
        items,
      },
    };
  }

  if (definition.workflowKind !== 'singleton') {
    return {
      ok: false,
      status: 405,
      errors: [{ field: 'diff', code: 'unsupported', message: `${code} does not support diff` }],
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
  const before = detail.publishedPayload || {};
  const after = detail.draftPayload || detail.publishedPayload || {};
  const items: ConfigProfileDiffItem[] = [];
  diffValues(before, after, '', items);

  return {
    ok: true,
    diff: {
      profileCode: code,
      supported: true,
      draftRevision: Number(detail.draftRevision?.revision) || null,
      publishedRevision: Number(detail.publishedRevision?.revision) || null,
      hasChanges: items.length > 0,
      items,
    },
  };
}
