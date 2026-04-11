import { computed, reactive } from 'vue';
import type { ComputedRef } from 'vue';
import type { MappingRuleSet, RuleExplainResult } from '@/types/mappingRules';
import { explainRuleSet } from '@/services/mappings';

export type ExplainSnapshot = Record<string, unknown>;
export type RuleExplainFieldType = 'text' | 'number';

export interface RuleExplainFieldDefinition {
  field: string;
  label: string;
  placeholder?: string;
  type?: RuleExplainFieldType;
  min?: number;
  setValue?: (preview: RuleExplainPreviewHandle, value: string | number) => void;
}

export interface RuleExplainPreviewHandle {
  snapshot: ExplainSnapshot;
  result: ComputedRef<RuleExplainResult>;
  matchedCount: ComputedRef<number>;
  setField: (field: string, value: unknown) => void;
  reset: (nextSnapshot?: ExplainSnapshot) => void;
}

export interface RuleExplainPreviewOptions {
  transformResult?: (result: RuleExplainResult, snapshot: ExplainSnapshot) => RuleExplainResult;
}

export function useRuleExplainPreview(
  ruleSet: () => MappingRuleSet,
  initialSnapshot: ExplainSnapshot,
  options?: RuleExplainPreviewOptions,
): RuleExplainPreviewHandle {
  const snapshot = reactive<ExplainSnapshot>({ ...initialSnapshot });

  const result = computed<RuleExplainResult>(() => {
    const snapshotCopy = { ...snapshot };
    const explained = explainRuleSet(ruleSet(), snapshotCopy);
    return options?.transformResult
      ? options.transformResult(explained, snapshotCopy)
      : explained;
  });
  const matchedCount = computed(() => result.value.traces.filter((item) => item.matched).length);

  function setField(field: string, value: unknown) {
    if (field.startsWith('meta.')) {
      const key = field.slice('meta.'.length);
      const currentMeta = snapshot.meta;
      const nextMeta =
        currentMeta && typeof currentMeta === 'object' && !Array.isArray(currentMeta)
          ? { ...(currentMeta as Record<string, unknown>) }
          : {};
      nextMeta[key] = value;
      snapshot.meta = nextMeta;
      return;
    }
    snapshot[field] = value;
  }

  function reset(nextSnapshot?: ExplainSnapshot) {
    const source = nextSnapshot || initialSnapshot;
    Object.keys(snapshot).forEach((key) => {
      delete snapshot[key];
    });
    Object.assign(snapshot, source);
  }

  return {
    snapshot,
    result,
    matchedCount,
    setField,
    reset,
  };
}
