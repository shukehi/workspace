import type {
  MappingRuleSet,
  RuleExplainResult,
} from '@/types/mappingRules';
import {
  collectRuleExecution,
  type RuleInputSnapshot,
} from '@/services/mappings/mappingRules.execute';

export function explainRuleSet(
  ruleSet: MappingRuleSet,
  inputSnapshot: RuleInputSnapshot,
): RuleExplainResult {
  const execution = collectRuleExecution(ruleSet, inputSnapshot);
  const traces = execution.sortedRules.map((rule) => {
    const matched = execution.matchedRules.some((candidate) => candidate.id === rule.id);
    return {
      ruleId: rule.id,
      matched,
      skippedReason: matched ? undefined : 'conditions-not-met',
      priority: rule.priority,
      stage: rule.stage,
    };
  });

  return {
    profile: ruleSet.metadata.profileCode,
    inputSnapshot,
    traces,
    winningRules: execution.winningRuleIds,
    output: execution.output,
  };
}
