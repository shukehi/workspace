export type RuleProfileCode =
  | 'packaging'
  | 'cylinder'
  | 'lock'
  | 'lock_fork'
  | 'handle'
  | 'accessory';

export interface RuleSetMetadata {
  profileCode: RuleProfileCode;
  schemaVersion: number;
  description?: string;
  defaultEnabled?: boolean;
}

export interface MappingRuleDefaults {
  supplier?: string;
  unit?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  unmatchedSupplier?: string;
  manualReviewLabel?: string;
  heightReference?: number;
  extra?: Record<string, unknown>;
}

export type RuleStage =
  | 'base_mapping'
  | 'derived_mapping'
  | 'output_assembly';

export type RuleScope =
  | 'primary'
  | 'secondary'
  | 'all'
  | 'export_only';

export type RuleFieldRef =
  | 'sj'
  | 'fssj'
  | 'sx'
  | 'fssx'
  | 'sxhz'
  | 'fshz'
  | 'spec'
  | 'thickness'
  | 'openDirection'
  | 'doorHeight'
  | 'mb'
  | 'xsbz'
  | 'customerName'
  | 'productModelName'
  | 'qtyLeft'
  | 'qtyRight'
  | 'qtyTotal'
  | `meta.${string}`;

export interface RuleBaseCondition {
  field: RuleFieldRef;
}

export interface RuleEqualsCondition extends RuleBaseCondition {
  op: 'eq';
  value: string | number | boolean;
}

export interface RuleIncludesCondition extends RuleBaseCondition {
  op: 'includes';
  value: string;
}

export interface RuleInCondition extends RuleBaseCondition {
  op: 'in';
  value: Array<string | number>;
}

export interface RuleExistsCondition extends RuleBaseCondition {
  op: 'exists' | 'not_exists';
}

export interface RuleNumericCondition extends RuleBaseCondition {
  op: 'gt' | 'gte' | 'lt' | 'lte';
  value: number;
}

export type RuleCondition =
  | RuleEqualsCondition
  | RuleIncludesCondition
  | RuleInCondition
  | RuleExistsCondition
  | RuleNumericCondition;

export interface RuleConditionGroup {
  operator: 'and' | 'or';
  items: Array<RuleCondition | RuleConditionGroup>;
}

export type QuantityStrategy =
  | 'total'
  | 'left_right'
  | 'derived';

export interface QuantityFormula {
  source: 'qty' | 'qtyLeft' | 'qtyRight' | 'qtyPair';
  transform?: 'swap_left_right' | 'sum' | 'identity';
}

export interface RuleOutput {
  supplier?: string;
  type?: string;
  spec?: string;
  unit?: string;
  remark?: string;
  eccentricity?: string;
  code?: string;
  accessoryPack?: string;
  quantityStrategy?: QuantityStrategy;
  quantityFormula?: QuantityFormula;
  categoryOverride?: string;
  mergeKey?: string;
  flags?: Record<string, boolean>;
  extra?: Record<string, unknown>;
}

export interface MappingRule {
  id: string;
  profile: RuleProfileCode;
  enabled: boolean;
  priority: number;
  stage: RuleStage;
  scope?: RuleScope;
  when: RuleConditionGroup;
  then: RuleOutput;
  notes?: string;
  tags?: string[];
}

export interface MappingRuleSet {
  metadata: RuleSetMetadata;
  defaults?: MappingRuleDefaults;
  rules: MappingRule[];
}

export interface MappingRulePublishedPayload {
  ruleSet: MappingRuleSet;
}

export interface HybridMappingPublishedPayload<TLegacy> {
  legacy: TLegacy;
  ruleSet?: MappingRuleSet;
}

export interface RuleExplainTrace {
  ruleId: string;
  matched: boolean;
  skippedReason?: string;
  priority: number;
  stage: RuleStage;
}

export interface RuleExplainResult {
  profile: RuleProfileCode;
  inputSnapshot: Record<string, unknown>;
  traces: RuleExplainTrace[];
  winningRules: string[];
  output: RuleOutput;
}

export interface RuleExecutionResult {
  profile: RuleProfileCode;
  inputSnapshot: Record<string, unknown>;
  matchedRules: string[];
  winningRules: string[];
  output: RuleOutput;
}

export interface RuleValidationIssue {
  code: string;
  path: string;
  message: string;
  severity?: 'error' | 'warning';
}
