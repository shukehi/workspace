import type {
  CylinderAccessoryPackRule,
  CylinderMappingConfig,
  LockMappingConfig,
  LockForkMappingConfig,
} from '@/types/mapping';
import type {
  HybridMappingPublishedPayload,
  MappingRule,
  MappingRuleSet,
  RuleOutput,
} from '@/types/mappingRules';

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function buildAccessoryRuleId(ruleIndex: number, thickness: string): string {
  return `cylinder-secondary-accessory-${ruleIndex + 1}-${thickness}`;
}

function resolveAccessoryRuleScope(conditionField: string): 'primary' | 'secondary' | 'all' {
  if (conditionField === 'sxhz') return 'primary';
  if (conditionField === 'fshz') return 'secondary';
  return 'all';
}

function adaptCylinderAccessoryPackRule(
  rule: CylinderAccessoryPackRule,
  ruleIndex: number,
): MappingRule[] {
  const conditionField = toTrimmedString(rule.conditionField) || 'fshz';
  const keyword = toTrimmedString(rule.keyword);
  const supplier = toTrimmedString(rule.supplier);
  const itemName = toTrimmedString(rule.itemName) || keyword;
  const unit = toTrimmedString(rule.unit) || '个';
  const remark = toTrimmedString(rule.remark);

  return Object.entries(rule.thicknessAccessoryPacks || {}).reduce<MappingRule[]>((acc, [thickness, packName]) => {
      const normalizedThickness = toTrimmedString(thickness);
      const normalizedPackName = toTrimmedString(packName);
      const materialCode = toTrimmedString(rule.thicknessMaterialCodes?.[thickness]);
      if (!keyword || !normalizedThickness || !normalizedPackName || !materialCode) return acc;

      acc.push({
        id: buildAccessoryRuleId(ruleIndex, normalizedThickness),
        profile: 'accessory',
        enabled: true,
        priority: 1000 - ruleIndex,
        stage: 'derived_mapping',
        scope: resolveAccessoryRuleScope(conditionField),
        when: {
          operator: 'and',
          items: [
            { field: conditionField as any, op: 'includes', value: keyword },
            { field: 'thickness', op: 'eq', value: normalizedThickness },
          ],
        },
        then: {
          supplier,
          type: itemName,
          spec: normalizedPackName,
          unit,
          remark,
          code: materialCode,
          accessoryPack: normalizedPackName,
          quantityStrategy: 'total',
          quantityFormula: {
            source: 'qtyPair',
            transform: 'sum',
          },
          categoryOverride: '五金/配件',
          extra: {
            sourceField: conditionField,
          },
        },
        notes: 'Adapted from cylinder.secondaryAccessoryPackRules',
        tags: ['cylinder', 'secondary-accessory-pack'],
      } satisfies MappingRule);
      return acc;
    }, []);
}

export function adaptCylinderAccessoryPackRulesToRuleSet(
  payload: CylinderMappingConfig,
): MappingRuleSet {
  const rules = (payload.secondaryAccessoryPackRules || []).flatMap((rule, index) =>
    adaptCylinderAccessoryPackRule(rule, index),
  );

  return {
    metadata: {
      profileCode: 'accessory',
      schemaVersion: 1,
      description: 'Secondary shield accessory-pack rules adapted from cylinder mapping',
      defaultEnabled: true,
    },
    defaults: {
      unit: '个',
      unmatchedSupplier: '待人工处理',
      extra: {
        sourceProfile: 'cylinder',
        sourceField: 'secondaryAccessoryPackRules',
      },
    },
    rules,
  };
}

export function adaptCylinderToHybridRulePayload(
  payload: CylinderMappingConfig,
): HybridMappingPublishedPayload<CylinderMappingConfig> {
  return {
    legacy: payload,
    ruleSet: adaptCylinderAccessoryPackRulesToRuleSet(payload),
  };
}

function buildLockRuleId(mode: 'primary' | 'secondary', normalizedModel: string): string {
  return `lock-${mode}-${normalizedModel}`;
}

export function adaptLockMappingsToRuleSet(
  payload: LockMappingConfig,
  mode: 'primary' | 'secondary',
  normalizeKey: (value: string) => string,
): MappingRuleSet {
  const rules = Object.entries(payload.mappings || {}).reduce<MappingRule[]>((acc, [model, entry]) => {
    const normalizedModel = toTrimmedString(normalizeKey(model));
    if (!normalizedModel) return acc;

    acc.push({
      id: buildLockRuleId(mode, normalizedModel),
      profile: 'lock',
      enabled: true,
      priority: 1000,
      stage: 'base_mapping',
      scope: mode,
      when: {
        operator: 'and',
        items: [
          { field: 'meta.normalizedModel', op: 'eq', value: normalizedModel },
        ],
      },
      then: {
        supplier: toTrimmedString(entry.supplier) || '待人工处理',
        type: toTrimmedString(entry.vendorName),
        spec: toTrimmedString(mode === 'primary' ? entry.primarySpec : entry.secondarySpec)
          || toTrimmedString(mode === 'primary' ? payload.primaryLabel : payload.secondaryLabel),
        unit: toTrimmedString(payload.defaultUnit),
        remark: toTrimmedString(entry.remark),
        extra: {
          sourceModel: model,
          normalizedModel,
          mode,
        },
      },
      notes: 'Adapted from lock.mappings',
      tags: ['lock', mode],
    });

    return acc;
  }, []);

  return {
    metadata: {
      profileCode: 'lock',
      schemaVersion: 1,
      description: `Lock mapping rules adapted for ${mode} preview`,
      defaultEnabled: true,
    },
    defaults: {
      supplier: '待人工处理',
      unit: toTrimmedString(payload.defaultUnit),
      extra: {
        mode,
      },
      ...(mode === 'primary'
        ? { primaryLabel: toTrimmedString(payload.primaryLabel) }
        : { secondaryLabel: toTrimmedString(payload.secondaryLabel) }),
    },
    rules,
  };
}

export function applyLockRulePreviewFallbacks(
  payload: LockMappingConfig,
  mode: 'primary' | 'secondary',
  rawModel: string,
  output: RuleOutput,
): RuleOutput {
  const normalizedRawModel = toTrimmedString(rawModel);
  const fallbackSpec = toTrimmedString(
    mode === 'primary' ? payload.primaryLabel : payload.secondaryLabel,
  );

  return {
    ...output,
    type: toTrimmedString(output.type) || normalizedRawModel,
    spec: toTrimmedString(output.spec) || fallbackSpec,
    unit: toTrimmedString(output.unit) || toTrimmedString(payload.defaultUnit),
  };
}

function buildLockForkTypeRuleId(lockTypeName: string): string {
  return `lock-fork-type-${lockTypeName}`;
}

export function adaptLockForkTypeRulesToRuleSet(
  payload: LockForkMappingConfig,
): MappingRuleSet {
  const rules = Object.entries(payload.lockTypes || {}).reduce<MappingRule[]>((acc, [name, config]) => {
    const normalizedName = toTrimmedString(name);
    if (!normalizedName) return acc;

    acc.push({
      id: buildLockForkTypeRuleId(normalizedName),
      profile: 'lock_fork',
      enabled: true,
      priority: 1000,
      stage: 'derived_mapping',
      scope: 'all',
      when: {
        operator: 'or',
        items: [
          { field: 'sj', op: 'eq', value: normalizedName },
          { field: 'fssj', op: 'eq', value: normalizedName },
        ],
      },
      then: {
        type: normalizedName,
        extra: {
          category: toTrimmedString(config.category),
          nameModifier: toTrimmedString(config.nameModifier),
          upper: toTrimmedString(config.upper),
          lower: toTrimmedString(config.lower),
        },
      },
      notes: 'Adapted from lockFork.lockTypes',
      tags: ['lock_fork', 'lock_type'],
    });

    return acc;
  }, []);

  return {
    metadata: {
      profileCode: 'lock_fork',
      schemaVersion: 1,
      description: 'Lock fork type preview rules adapted from lock fork mapping',
      defaultEnabled: true,
    },
    rules,
  };
}
