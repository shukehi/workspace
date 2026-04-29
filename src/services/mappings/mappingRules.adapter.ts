import { adaptLockMapping } from '@/services/mappings/mappingAdapter';
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
  const adaptedPayload = adaptLockMapping(payload);
  const rules = Object.entries(adaptedPayload.mappings || {}).reduce<MappingRule[]>((acc, [model, entry]) => {
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
          || toTrimmedString(mode === 'primary' ? adaptedPayload.primaryLabel : adaptedPayload.secondaryLabel),
        unit: toTrimmedString(adaptedPayload.defaultUnit),
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
      unit: toTrimmedString(adaptedPayload.defaultUnit),
      extra: {
        mode,
      },
      ...(mode === 'primary'
        ? { primaryLabel: toTrimmedString(adaptedPayload.primaryLabel) }
        : { secondaryLabel: toTrimmedString(adaptedPayload.secondaryLabel) }),
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
  const adaptedPayload = adaptLockMapping(payload);
  const normalizedRawModel = toTrimmedString(rawModel);
  const fallbackSpec = toTrimmedString(
    mode === 'primary' ? adaptedPayload.primaryLabel : adaptedPayload.secondaryLabel,
  );

  return {
    ...output,
    type: toTrimmedString(output.type) || normalizedRawModel,
    spec: toTrimmedString(output.spec) || fallbackSpec,
    unit: toTrimmedString(output.unit) || toTrimmedString(adaptedPayload.defaultUnit),
  };
}

function buildLockForkTypeRuleId(lockTypeName: string): string {
  return `lock-fork-type-${lockTypeName}`;
}

function buildLockForkEdgeRuleId(edgeTypeName: string): string {
  return `lock-fork-edge-${edgeTypeName}`;
}

function buildLockForkHangingFeetRuleId(keyword: string): string {
  return `lock-fork-hanging-feet-${keyword}`;
}

function buildLockForkFlatBottomRuleId(): string {
  return 'lock-fork-flat-bottom';
}

function buildLockForkDimensionRuleId(
  source: 'base' | 'high_height' | 'fallback_7',
  thicknessKey: string,
  variant: 'standard' | 'withHangingFeet',
): string {
  return `lock-fork-dimension-${source}-${thicknessKey}-${variant}`;
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

export function adaptLockForkEdgeTypeRulesToRuleSet(
  payload: LockForkMappingConfig,
): MappingRuleSet {
  const rules = Object.entries(payload.edgeTypes || {}).reduce<MappingRule[]>((acc, [name, config]) => {
    const normalizedName = toTrimmedString(name);
    if (!normalizedName) return acc;

    acc.push({
      id: buildLockForkEdgeRuleId(normalizedName),
      profile: 'lock_fork',
      enabled: true,
      priority: 1000,
      stage: 'derived_mapping',
      scope: 'all',
      when: {
        operator: 'and',
        items: [
          { field: 'mb', op: 'includes', value: normalizedName },
        ],
      },
      then: {
        type: normalizedName,
        extra: {
          nameModifier: toTrimmedString(config.nameModifier),
        },
      },
      notes: 'Adapted from lockFork.edgeTypes',
      tags: ['lock_fork', 'edge_type'],
    });

    return acc;
  }, []);

  return {
    metadata: {
      profileCode: 'lock_fork',
      schemaVersion: 1,
      description: 'Lock fork edge type preview rules adapted from lock fork mapping',
      defaultEnabled: true,
    },
    rules,
  };
}

export function adaptLockForkHangingFeetRulesToRuleSet(
  payload: LockForkMappingConfig,
): MappingRuleSet {
  const rules = (payload.hangingFeet?.keywords || []).reduce<MappingRule[]>((acc, keyword) => {
    const normalizedKeyword = toTrimmedString(keyword);
    if (!normalizedKeyword) return acc;

    acc.push({
      id: buildLockForkHangingFeetRuleId(normalizedKeyword),
      profile: 'lock_fork',
      enabled: true,
      priority: 1000,
      stage: 'derived_mapping',
      scope: 'all',
      when: {
        operator: 'and',
        items: [
          { field: 'xsbz', op: 'includes', value: normalizedKeyword },
        ],
      },
      then: {
        extra: {
          mode: 'hanging_feet',
          keyword: normalizedKeyword,
          standard: payload.hangingFeet?.standard,
        },
      },
      notes: 'Adapted from lockFork.hangingFeet.keywords',
      tags: ['lock_fork', 'hanging_feet'],
    });

    return acc;
  }, []);

  return {
    metadata: {
      profileCode: 'lock_fork',
      schemaVersion: 1,
      description: 'Lock fork hanging-feet preview rules adapted from lock fork mapping',
      defaultEnabled: true,
    },
    rules,
  };
}

export function adaptLockForkFlatBottomRulesToRuleSet(): MappingRuleSet {
  return {
    metadata: {
      profileCode: 'lock_fork',
      schemaVersion: 1,
      description: 'Lock fork flat-bottom detection rules',
      defaultEnabled: true,
    },
    rules: [
      {
        id: buildLockForkFlatBottomRuleId(),
        profile: 'lock_fork',
        enabled: true,
        priority: 1000,
        stage: 'derived_mapping',
        scope: 'all',
        when: {
          operator: 'and',
          items: [
            { field: 'xsbz', op: 'includes', value: '平下档' },
          ],
        },
        then: {
          extra: {
            mode: 'flat_bottom',
          },
        },
        notes: 'Built-in flat-bottom detection rule for lock fork extraction',
        tags: ['lock_fork', 'flat_bottom'],
      },
    ],
  };
}

export function adaptLockForkDimensionSelectionRulesToRuleSet(
  payload: LockForkMappingConfig,
): MappingRuleSet {
  const rules: MappingRule[] = [];

  const pushRule = (
    source: 'base' | 'high_height' | 'fallback_7',
    thicknessKey: string,
    matchThicknessKey: string,
    variant: 'standard' | 'withHangingFeet',
    extraConditions: MappingRule['when']['items'] = [],
    heightReference?: number,
  ) => {
    rules.push({
      id: buildLockForkDimensionRuleId(source, thicknessKey, variant),
      profile: 'lock_fork',
      enabled: true,
      priority: source === 'high_height' ? 2000 : 1000,
      stage: 'derived_mapping',
        scope: 'all',
        when: {
          operator: 'and',
          items: [
            { field: 'meta.useHangingFeetDimensions', op: 'eq', value: variant === 'withHangingFeet' },
            { field: 'thickness', op: 'eq', value: matchThicknessKey },
            ...extraConditions,
          ],
        },
      then: {
        extra: {
          source,
          thicknessKey,
          variant,
          ...(heightReference !== undefined ? { heightReference } : {}),
        },
      },
      notes: 'Adapted from lockFork dimension selection',
      tags: ['lock_fork', 'dimension_selection', source, variant],
    });
  };

  Object.entries(payload.baseDimensions || {}).forEach(([thicknessKey]) => {
    pushRule('base', thicknessKey, thicknessKey, 'standard');
    pushRule('base', thicknessKey, thicknessKey, 'withHangingFeet');
  });

  if (!payload.baseDimensions?.['5'] && payload.baseDimensions?.['7']) {
    pushRule('fallback_7', '7', '5', 'standard');
    pushRule('fallback_7', '7', '5', 'withHangingFeet');
  }

  Object.entries(payload.highHeightRules || {}).forEach(([thicknessKey, rule]) => {
    const minHeight = Number(rule.minHeight || 0);
    const heightReference = Number(rule.heightReference || payload.heightReference || 2050);
    pushRule('high_height', thicknessKey, thicknessKey, 'standard', [{ field: 'doorHeight', op: 'gte', value: minHeight }], heightReference);
    pushRule('high_height', thicknessKey, thicknessKey, 'withHangingFeet', [{ field: 'doorHeight', op: 'gte', value: minHeight }], heightReference);
  });

  return {
    metadata: {
      profileCode: 'lock_fork',
      schemaVersion: 1,
      description: 'Lock fork dimension selection rules adapted from lock fork mapping',
      defaultEnabled: true,
    },
    defaults: {
      extra: {
        heightReference: payload.heightReference,
      },
    },
    rules,
  };
}
