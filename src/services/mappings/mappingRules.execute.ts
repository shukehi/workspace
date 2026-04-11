import type {
  MappingRule,
  MappingRuleDefaults,
  MappingRuleSet,
  RuleCondition,
  RuleConditionGroup,
  RuleExecutionResult,
  RuleOutput,
} from '@/types/mappingRules';

export type RuleInputSnapshot = Record<string, unknown>;

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function readRuleInputValue(snapshot: RuleInputSnapshot, field: string): unknown {
  if (field.startsWith('meta.')) {
    const key = field.slice('meta.'.length);
    const meta = snapshot.meta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
    return (meta as Record<string, unknown>)[key];
  }
  return snapshot[field];
}

export function evaluateRuleCondition(condition: RuleCondition, snapshot: RuleInputSnapshot): boolean {
  const fieldValue = readRuleInputValue(snapshot, condition.field);

  switch (condition.op) {
    case 'eq':
      return String(fieldValue ?? '') === String(condition.value ?? '');
    case 'includes':
      return toTrimmedString(fieldValue).includes(toTrimmedString(condition.value));
    case 'in':
      return condition.value.map((item) => String(item)).includes(String(fieldValue ?? ''));
    case 'exists':
      return toTrimmedString(fieldValue).length > 0;
    case 'not_exists':
      return toTrimmedString(fieldValue).length === 0;
    case 'gt':
      return Number(fieldValue) > condition.value;
    case 'gte':
      return Number(fieldValue) >= condition.value;
    case 'lt':
      return Number(fieldValue) < condition.value;
    case 'lte':
      return Number(fieldValue) <= condition.value;
    default:
      return false;
  }
}

export function evaluateRuleConditionGroup(group: RuleConditionGroup, snapshot: RuleInputSnapshot): boolean {
  const results = group.items.map((item) => {
    if ('items' in item) {
      return evaluateRuleConditionGroup(item, snapshot);
    }
    return evaluateRuleCondition(item, snapshot);
  });

  if (group.operator === 'or') {
    return results.some(Boolean);
  }
  return results.every(Boolean);
}

export function sortRuleSetRules(rules: MappingRule[]): MappingRule[] {
  return [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
}

export function mergeRuleOutputs(base: RuleOutput, output: RuleOutput): RuleOutput {
  return {
    ...base,
    ...output,
    extra: {
      ...(base.extra || {}),
      ...(output.extra || {}),
    },
    flags: {
      ...(base.flags || {}),
      ...(output.flags || {}),
    },
  };
}

export function defaultsToRuleOutput(defaults?: MappingRuleDefaults): RuleOutput {
  if (!defaults) return {};
  return {
    supplier: defaults.supplier,
    unit: defaults.unit,
    flags: {},
    extra: {
      ...(defaults.extra || {}),
      ...(defaults.unmatchedSupplier ? { unmatchedSupplier: defaults.unmatchedSupplier } : {}),
      ...(defaults.manualReviewLabel ? { manualReviewLabel: defaults.manualReviewLabel } : {}),
      ...(defaults.primaryLabel ? { primaryLabel: defaults.primaryLabel } : {}),
      ...(defaults.secondaryLabel ? { secondaryLabel: defaults.secondaryLabel } : {}),
      ...(defaults.heightReference !== undefined ? { heightReference: defaults.heightReference } : {}),
    },
  };
}

export interface RuleExecutionTrace {
  sortedRules: MappingRule[];
  matchedRules: MappingRule[];
  output: RuleOutput;
  winningRuleIds: string[];
}

export function collectRuleExecution(
  ruleSet: MappingRuleSet,
  inputSnapshot: RuleInputSnapshot,
): RuleExecutionTrace {
  const sortedRules = sortRuleSetRules(ruleSet.rules.filter((rule) => rule.enabled !== false));
  const matchedRules = sortedRules.filter((rule) => evaluateRuleConditionGroup(rule.when, inputSnapshot));
  const winningRuleIds = new Set<string>();
  let output = defaultsToRuleOutput(ruleSet.defaults);

  for (const rule of [...matchedRules].reverse()) {
    output = mergeRuleOutputs(output, rule.then);
  }

  for (const key of Object.keys(output)) {
    if (key === 'extra' || key === 'flags') continue;
    for (const rule of matchedRules) {
      const candidateValue = (rule.then as Record<string, unknown>)[key];
      if (candidateValue === undefined) continue;
      if ((output as Record<string, unknown>)[key] === candidateValue) {
        winningRuleIds.add(rule.id);
        break;
      }
    }
  }

  if (output.extra && Object.keys(output.extra).length > 0) {
    for (const [key, value] of Object.entries(output.extra)) {
      for (const rule of matchedRules) {
        const candidateExtra = rule.then.extra || {};
        if (candidateExtra[key] === value) {
          winningRuleIds.add(rule.id);
          break;
        }
      }
    }
  }

  if (output.flags && Object.keys(output.flags).length > 0) {
    for (const [key, value] of Object.entries(output.flags)) {
      for (const rule of matchedRules) {
        const candidateFlags = rule.then.flags || {};
        if (candidateFlags[key] === value) {
          winningRuleIds.add(rule.id);
          break;
        }
      }
    }
  }

  return {
    sortedRules,
    matchedRules,
    output,
    winningRuleIds: matchedRules
      .map((rule) => rule.id)
      .filter((ruleId) => winningRuleIds.has(ruleId)),
  };
}

export function executeRuleSet(
  ruleSet: MappingRuleSet,
  inputSnapshot: RuleInputSnapshot,
): RuleExecutionResult {
  const execution = collectRuleExecution(ruleSet, inputSnapshot);

  return {
    profile: ruleSet.metadata.profileCode,
    inputSnapshot,
    matchedRules: execution.matchedRules.map((rule) => rule.id),
    winningRules: execution.winningRuleIds,
    output: execution.output,
  };
}
