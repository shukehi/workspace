import { adaptLockForkDimensionSelectionRulesToRuleSet } from '@/services/mappings/mappingRules.adapter';
import { executeRuleSet } from '@/services/mappings/mappingRules.execute';
import { DEFAULT_LOCK_FORK_HEIGHT_REFERENCE } from '@/services/mappings/mappingAdapter';
import type {
  LockForkBaseDimensionRule,
  LockForkDimensionGroup,
  LockForkMappingConfig,
} from '@/types/mapping';

export interface LockForkDimensionSelectionParams {
  thickness: string;
  doorHeight: number;
  useHangingFeetDimensions: boolean;
}

export interface LockForkDimensionSelectionResult {
  dimensions: LockForkDimensionGroup | null;
  heightReference: number;
  matchedRules: string[];
  winningRules: string[];
  selectedThicknessKey?: string;
  selectedVariant?: 'standard' | 'withHangingFeet';
  source?: 'base' | 'high_height' | 'fallback_7';
}

function chooseDimensionGroup(
  rule: LockForkBaseDimensionRule | undefined,
  variant: 'standard' | 'withHangingFeet',
): LockForkDimensionGroup | null {
  if (!rule) return null;
  if (variant === 'withHangingFeet') {
    return rule.withHangingFeet || rule.standard || null;
  }
  return rule.standard || rule.withHangingFeet || null;
}

export function resolveLockForkDimensionRuleLegacy(
  payload: LockForkMappingConfig,
  params: LockForkDimensionSelectionParams,
): LockForkDimensionSelectionResult {
  const { thickness, doorHeight, useHangingFeetDimensions } = params;
  const defaultHeightReference = Number(payload.heightReference || DEFAULT_LOCK_FORK_HEIGHT_REFERENCE);
  const variant = useHangingFeetDimensions ? 'withHangingFeet' : 'standard';

  const highHeightRule = payload.highHeightRules?.[thickness];
  if (highHeightRule && doorHeight >= Number(highHeightRule.minHeight || 0)) {
    return {
      dimensions: chooseDimensionGroup(highHeightRule, variant),
      heightReference: Number(highHeightRule.heightReference || defaultHeightReference),
      matchedRules: [],
      winningRules: [],
      selectedThicknessKey: thickness,
      selectedVariant: variant,
      source: 'high_height',
    };
  }

  let thicknessKey = thickness;
  let baseDimensions = payload.baseDimensions?.[thicknessKey];
  let source: LockForkDimensionSelectionResult['source'] = 'base';
  if (!baseDimensions && thickness === '5') {
    thicknessKey = '7';
    baseDimensions = payload.baseDimensions?.[thicknessKey];
    source = 'fallback_7';
  }

  if (!baseDimensions) {
    return {
      dimensions: null,
      heightReference: defaultHeightReference,
      matchedRules: [],
      winningRules: [],
    };
  }

  return {
    dimensions: chooseDimensionGroup(baseDimensions, variant),
    heightReference: defaultHeightReference,
    matchedRules: [],
    winningRules: [],
    selectedThicknessKey: thicknessKey,
    selectedVariant: variant,
    source,
  };
}

export function resolveLockForkDimensionRuleWithRules(
  payload: LockForkMappingConfig,
  params: LockForkDimensionSelectionParams,
): LockForkDimensionSelectionResult {
  const { thickness, doorHeight, useHangingFeetDimensions } = params;
  const defaultHeightReference = Number(payload.heightReference || DEFAULT_LOCK_FORK_HEIGHT_REFERENCE);
  const ruleSet = adaptLockForkDimensionSelectionRulesToRuleSet(payload);
  const execution = executeRuleSet(ruleSet, {
    thickness,
    doorHeight,
    meta: {
      useHangingFeetDimensions,
    },
  });

  const source = String(execution.output.extra?.source || '').trim() as LockForkDimensionSelectionResult['source'];
  const selectedThicknessKey = String(execution.output.extra?.thicknessKey || '').trim();
  const selectedVariant = String(execution.output.extra?.variant || '').trim() as LockForkDimensionSelectionResult['selectedVariant'];
  const heightReference = Number(execution.output.extra?.heightReference || defaultHeightReference);

  if (!source || !selectedThicknessKey || !selectedVariant) {
    return {
      dimensions: null,
      heightReference: defaultHeightReference,
      matchedRules: execution.matchedRules,
      winningRules: execution.winningRules,
    };
  }

  const sourceRule = source === 'high_height'
    ? payload.highHeightRules?.[selectedThicknessKey]
    : payload.baseDimensions?.[selectedThicknessKey];

  return {
    dimensions: chooseDimensionGroup(sourceRule, selectedVariant),
    heightReference,
    matchedRules: execution.matchedRules,
    winningRules: execution.winningRules,
    selectedThicknessKey,
    selectedVariant,
    source,
  };
}
