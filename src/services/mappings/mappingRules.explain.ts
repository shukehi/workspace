import type {
  MappingRule,
  MappingRuleDefaults,
  MappingRuleSet,
  RuleCondition,
  RuleConditionGroup,
  RuleExplainResult,
  RuleOutput,
} from '@/types/mappingRules';

type RuleInputSnapshot = Record<string, unknown>;

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function readInputValue(snapshot: RuleInputSnapshot, field: string): unknown {
  if (field.startsWith('meta.')) {
    const key = field.slice('meta.'.length);
    const meta = snapshot.meta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined;
    return (meta as Record<string, unknown>)[key];
  }
  return snapshot[field];
}

function evaluateCondition(condition: RuleCondition, snapshot: RuleInputSnapshot): boolean {
  const fieldValue = readInputValue(snapshot, condition.field);

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

function evaluateConditionGroup(group: RuleConditionGroup, snapshot: RuleInputSnapshot): boolean {
  const results = group.items.map((item) => {
    if ('items' in item) {
      return evaluateConditionGroup(item, snapshot);
    }
    return evaluateCondition(item, snapshot);
  });

  if (group.operator === 'or') {
    return results.some(Boolean);
  }
  return results.every(Boolean);
}

function sortRules(rules: MappingRule[]): MappingRule[] {
  return [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });
}

function mergeRuleOutputs(base: RuleOutput, output: RuleOutput): RuleOutput {
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

function defaultsToOutput(defaults?: MappingRuleDefaults): RuleOutput {
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

export function explainRuleSet(
  ruleSet: MappingRuleSet,
  inputSnapshot: RuleInputSnapshot,
): RuleExplainResult {
  const sortedRules = sortRules(ruleSet.rules.filter((rule) => rule.enabled !== false));
  const matchedRules = sortedRules.filter((rule) => evaluateConditionGroup(rule.when, inputSnapshot));
  const traces = sortedRules.map((rule) => {
    const matched = matchedRules.some((candidate) => candidate.id === rule.id);
    return {
      ruleId: rule.id,
      matched,
      skippedReason: matched ? undefined : 'conditions-not-met',
      priority: rule.priority,
      stage: rule.stage,
    };
  });

  const winningRuleIds = new Set<string>();
  let output = defaultsToOutput(ruleSet.defaults);

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
    profile: ruleSet.metadata.profileCode,
    inputSnapshot,
    traces,
    winningRules: matchedRules
      .map((rule) => rule.id)
      .filter((ruleId) => winningRuleIds.has(ruleId)),
    output,
  };
}
