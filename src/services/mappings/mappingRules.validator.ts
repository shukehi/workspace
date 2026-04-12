import type {
  MappingRule,
  MappingRuleSet,
  QuantityFormula,
  RuleCondition,
  RuleConditionGroup,
  RuleFieldRef,
  RuleOutput,
  RuleProfileCode,
  RuleScope,
  RuleStage,
  RuleValidationIssue,
} from '@/types/mappingRules';

const PROFILE_CODES: RuleProfileCode[] = [
  'packaging',
  'cylinder',
  'lock',
  'lock_fork',
  'handle',
  'accessory',
];

const RULE_STAGES: RuleStage[] = [
  'base_mapping',
  'derived_mapping',
  'output_assembly',
];

const RULE_SCOPES: RuleScope[] = [
  'primary',
  'secondary',
  'all',
  'export_only',
];

const FIELD_REFS: RuleFieldRef[] = [
  'sj',
  'fssj',
  'sx',
  'fssx',
  'sxhz',
  'fshz',
  'spec',
  'thickness',
  'openDirection',
  'doorHeight',
  'mb',
  'xsbz',
  'customerName',
  'productModelName',
  'qtyLeft',
  'qtyRight',
  'qtyTotal',
];

const EQUALITY_OPS = new Set(['eq']);
const STRING_OPS = new Set(['includes']);
const ARRAY_OPS = new Set(['in']);
const EXISTS_OPS = new Set(['exists', 'not_exists']);
const NUMERIC_OPS = new Set(['gt', 'gte', 'lt', 'lte']);

const QUANTITY_STRATEGIES = new Set(['total', 'left_right', 'derived']);
const QUANTITY_SOURCES = new Set(['qty', 'qtyLeft', 'qtyRight', 'qtyPair']);
const QUANTITY_TRANSFORMS = new Set(['swap_left_right', 'sum', 'identity']);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRuleFieldRef(value: unknown): value is RuleFieldRef {
  return (typeof value === 'string' && value.startsWith('meta.'))
    || FIELD_REFS.includes(value as RuleFieldRef);
}

function createIssue(path: string, code: string, message: string, severity: 'error' | 'warning' = 'error'): RuleValidationIssue {
  return { path, code, message, severity };
}

function hasOwnValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function validateQuantityFormula(value: unknown, path: string): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  if (value === undefined) return issues;
  if (!isPlainObject(value)) {
    issues.push(createIssue(path, 'invalid-type', 'quantityFormula 必须是对象'));
    return issues;
  }

  const source = String(value.source || '').trim();
  if (!QUANTITY_SOURCES.has(source)) {
    issues.push(createIssue(`${path}.source`, 'invalid-value', 'quantityFormula.source 不合法'));
  }

  if (value.transform !== undefined) {
    const transform = String(value.transform || '').trim();
    if (!QUANTITY_TRANSFORMS.has(transform)) {
      issues.push(createIssue(`${path}.transform`, 'invalid-value', 'quantityFormula.transform 不合法'));
    }
  }

  return issues;
}

function validateRuleOutput(value: unknown, path: string): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  if (!isPlainObject(value)) {
    issues.push(createIssue(path, 'invalid-type', 'then 必须是对象'));
    return issues;
  }

  const output = value as RuleOutput;
  const hasOutput = [
    output.supplier,
    output.type,
    output.spec,
    output.unit,
    output.remark,
    output.eccentricity,
    output.code,
    output.accessoryPack,
    output.quantityStrategy,
    output.quantityFormula,
    output.categoryOverride,
    output.mergeKey,
    output.flags,
    output.extra,
  ].some(hasOwnValue);

  if (!hasOutput) {
    issues.push(createIssue(path, 'missing-output', 'then 至少要定义一个输出字段'));
  }

  if (output.quantityStrategy !== undefined) {
    const strategy = String(output.quantityStrategy || '').trim();
    if (!QUANTITY_STRATEGIES.has(strategy)) {
      issues.push(createIssue(`${path}.quantityStrategy`, 'invalid-value', 'quantityStrategy 不合法'));
    }
  }

  issues.push(...validateQuantityFormula(output.quantityFormula, `${path}.quantityFormula`));
  return issues;
}

function validateRuleCondition(value: unknown, path: string): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  if (!isPlainObject(value)) {
    issues.push(createIssue(path, 'invalid-type', 'condition 必须是对象'));
    return issues;
  }

  const raw = value as Record<string, unknown>;
  if (!isRuleFieldRef(raw.field)) {
    issues.push(createIssue(`${path}.field`, 'invalid-value', 'condition.field 不合法'));
  }

  const op = String(raw.op || '').trim();
  if (!op) {
    issues.push(createIssue(`${path}.op`, 'required', 'condition.op 不能为空'));
    return issues;
  }

  if (EQUALITY_OPS.has(op)) {
    if (raw.value === undefined) {
      issues.push(createIssue(`${path}.value`, 'required', 'eq 条件必须提供 value'));
    }
    return issues;
  }

  if (STRING_OPS.has(op)) {
    if (typeof raw.value !== 'string' || !String(raw.value).trim()) {
      issues.push(createIssue(`${path}.value`, 'required', 'includes 条件必须提供非空字符串 value'));
    }
    return issues;
  }

  if (ARRAY_OPS.has(op)) {
    if (!Array.isArray(raw.value) || raw.value.length === 0) {
      issues.push(createIssue(`${path}.value`, 'required', 'in 条件必须提供非空数组 value'));
    }
    return issues;
  }

  if (EXISTS_OPS.has(op)) {
    return issues;
  }

  if (NUMERIC_OPS.has(op)) {
    const numericValue = Number(raw.value);
    if (!Number.isFinite(numericValue)) {
      issues.push(createIssue(`${path}.value`, 'invalid-value', `${op} 条件必须提供数值 value`));
    }
    return issues;
  }

  issues.push(createIssue(`${path}.op`, 'invalid-value', 'condition.op 不合法'));
  return issues;
}

function validateConditionGroup(value: unknown, path: string): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  if (!isPlainObject(value)) {
    issues.push(createIssue(path, 'invalid-type', 'when 必须是对象'));
    return issues;
  }

  const operator = String(value.operator || '').trim();
  if (operator !== 'and' && operator !== 'or') {
    issues.push(createIssue(`${path}.operator`, 'invalid-value', 'condition group operator 必须是 and 或 or'));
  }

  if (!Array.isArray(value.items)) {
    issues.push(createIssue(`${path}.items`, 'invalid-type', 'condition group items 必须是数组'));
    return issues;
  }
  if (value.items.length === 0) {
    issues.push(createIssue(`${path}.items`, 'required', 'condition group items 不能为空'));
    return issues;
  }

  value.items.forEach((item, index) => {
    const itemPath = `${path}.items[${index}]`;
    if (isPlainObject(item) && Array.isArray(item.items)) {
      issues.push(...validateConditionGroup(item, itemPath));
      return;
    }
    issues.push(...validateRuleCondition(item, itemPath));
  });

  return issues;
}

function validateRule(rule: unknown, path: string, profileCode: RuleProfileCode): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  if (!isPlainObject(rule)) {
    issues.push(createIssue(path, 'invalid-type', 'rule 必须是对象'));
    return issues;
  }

  const raw = rule as Record<string, unknown>;
  const typed = raw as unknown as MappingRule;

  if (typeof typed.id !== 'string' || !typed.id.trim()) {
    issues.push(createIssue(`${path}.id`, 'required', 'rule.id 不能为空'));
  }
  if (!PROFILE_CODES.includes(typed.profile)) {
    issues.push(createIssue(`${path}.profile`, 'invalid-value', 'rule.profile 不合法'));
  } else if (typed.profile !== profileCode) {
    issues.push(createIssue(`${path}.profile`, 'profile-mismatch', 'rule.profile 必须与 ruleSet.metadata.profileCode 一致'));
  }
  if (typeof typed.enabled !== 'boolean') {
    issues.push(createIssue(`${path}.enabled`, 'invalid-type', 'rule.enabled 必须是布尔值'));
  }
  if (!Number.isFinite(Number(typed.priority))) {
    issues.push(createIssue(`${path}.priority`, 'invalid-type', 'rule.priority 必须是数值'));
  }
  if (!RULE_STAGES.includes(typed.stage)) {
    issues.push(createIssue(`${path}.stage`, 'invalid-value', 'rule.stage 不合法'));
  }
  if (typed.scope !== undefined && !RULE_SCOPES.includes(typed.scope)) {
    issues.push(createIssue(`${path}.scope`, 'invalid-value', 'rule.scope 不合法'));
  }

  issues.push(...validateConditionGroup(typed.when, `${path}.when`));
  issues.push(...validateRuleOutput(typed.then, `${path}.then`));
  return issues;
}

export function validateMappingRuleSet(value: unknown): RuleValidationIssue[] {
  const issues: RuleValidationIssue[] = [];
  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', 'ruleSet 必须是对象'));
    return issues;
  }

  const metadata = asRecord(value.metadata);
  if (!isPlainObject(value.metadata)) {
    issues.push(createIssue('metadata', 'invalid-type', 'metadata 必须是对象'));
  }

  const profileCode = String(metadata.profileCode || '').trim();
  if (!PROFILE_CODES.includes(profileCode as RuleProfileCode)) {
    issues.push(createIssue('metadata.profileCode', 'invalid-value', 'metadata.profileCode 不合法'));
  }

  const schemaVersion = Number(metadata.schemaVersion);
  if (!Number.isInteger(schemaVersion) || schemaVersion <= 0) {
    issues.push(createIssue('metadata.schemaVersion', 'invalid-value', 'metadata.schemaVersion 必须是正整数'));
  }

  if (value.defaults !== undefined && !isPlainObject(value.defaults)) {
    issues.push(createIssue('defaults', 'invalid-type', 'defaults 必须是对象'));
  }

  if (!Array.isArray(value.rules)) {
    issues.push(createIssue('rules', 'invalid-type', 'rules 必须是数组'));
    return issues;
  }

  const seenRuleIds = new Set<string>();
  value.rules.forEach((rule, index) => {
    const path = `rules[${index}]`;
    const ruleIssues = validateRule(rule, path, profileCode as RuleProfileCode);
    issues.push(...ruleIssues);

    const ruleId = isPlainObject(rule) ? String(rule.id || '').trim() : '';
    if (!ruleId) return;
    if (seenRuleIds.has(ruleId)) {
      issues.push(createIssue(`${path}.id`, 'duplicate-rule-id', 'rule.id 存在重复'));
      return;
    }
    seenRuleIds.add(ruleId);
  });

  return issues;
}
