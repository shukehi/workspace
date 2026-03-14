import test from 'node:test';
import assert from 'node:assert/strict';
import { SourceAnalysisRuntimeService } from '../src/features/source-analysis/services/sourceAnalysisRuntime';
import type { SourceAnalysisConfig } from '../src/types/sourceAnalysis';

const mockConfig = {
  formulas: { F1: { bom: [] } },
  materials: { M1: { code: 'M1' } },
  cylinderMapping: {},
  lockMapping: {},
  handleMapping: {},
  lockForkMapping: {},
  packagingMapping: {},
} as unknown as SourceAnalysisConfig;

test('source analysis runtime loads config before delegating to analyzer', async () => {
  const calls: string[] = [];
  const runtime = new SourceAnalysisRuntimeService({
    loadConfig: async () => {
      calls.push('loadConfig');
      return mockConfig;
    },
    analyze: (input) => {
      calls.push('analyze');
      assert.equal(input.config, mockConfig);
      assert.equal(input.order.code, 'C-001');
      return {
        materialRequirements: null,
        hardwareRequirements: {
          cylinders: [],
          locks: [],
          handles: [],
          lockForks: [],
          packaging: {},
        },
        flatMaterials: [],
        flatCylinders: [],
        flatLocks: [],
        flatHandles: [],
        flatForks: [],
        flatPackaging: [],
      };
    },
  });

  const result = await runtime.analyzeOrder({
    order: { code: 'C-001', list: [] },
  });

  assert.deepEqual(calls, ['loadConfig', 'analyze']);
  assert.deepEqual(result.flatMaterials, []);
});
