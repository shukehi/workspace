import type {
  CylinderAccessoryPackRule,
  CylinderMappingConfig,
} from '@/types/mapping';
import type {
  HybridMappingPublishedPayload,
  MappingRule,
  MappingRuleSet,
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
      if (!normalizedThickness || !normalizedPackName || !materialCode) return acc;

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
