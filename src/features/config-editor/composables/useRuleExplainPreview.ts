import { computed, reactive } from 'vue';
import type { MappingRuleSet, RuleExplainResult } from '@/types/mappingRules';
import { explainRuleSet } from '@/services/mappings';

export type ExplainSnapshot = Record<string, unknown>;

export function useRuleExplainPreview(ruleSet: () => MappingRuleSet, initialSnapshot: ExplainSnapshot) {
  const snapshot = reactive<ExplainSnapshot>({ ...initialSnapshot });

  const result = computed<RuleExplainResult>(() => explainRuleSet(ruleSet(), { ...snapshot }));
  const matchedCount = computed(() => result.value.traces.filter((item) => item.matched).length);

  function setField(field: string, value: unknown) {
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
