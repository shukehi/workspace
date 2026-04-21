import { getConfigProfileDiff } from './profile.diff';

export type ConfigProfileImpactSummary = {
  profileCode: string;
  supported: boolean;
  draftRevision: number | null;
  publishedRevision: number | null;
  hasChanges: boolean;
  totalChanges: number;
  counts: {
    added: number;
    removed: number;
    changed: number;
  };
  topPaths: Array<{
    path: string;
    kind: 'added' | 'removed' | 'changed';
  }>;
};

export async function getConfigProfileImpactSummary(code: string): Promise<{ ok: boolean; status?: number; errors?: Array<{ field: string; code?: string; message: string }>; impact?: ConfigProfileImpactSummary }> {
  const diffResult = await getConfigProfileDiff(code);
  if (!diffResult.ok || !diffResult.diff) {
    return {
      ok: false,
      status: diffResult.status,
      errors: diffResult.errors,
    };
  }

  const items = diffResult.diff.items || [];
  const counts = items.reduce((acc, item) => {
    acc[item.kind] += 1;
    return acc;
  }, { added: 0, removed: 0, changed: 0 });

  return {
    ok: true,
    impact: {
      profileCode: diffResult.diff.profileCode,
      supported: true,
      draftRevision: diffResult.diff.draftRevision,
      publishedRevision: diffResult.diff.publishedRevision,
      hasChanges: diffResult.diff.hasChanges,
      totalChanges: items.length,
      counts,
      topPaths: items.slice(0, 10).map((item) => ({ path: item.path, kind: item.kind })),
    },
  };
}
