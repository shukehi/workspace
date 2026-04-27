import test from 'node:test';
import assert from 'node:assert/strict';
import type { FormulaBomRecommendation } from '../src/shared/types/formulaRecommendation';

type ContractRow = {
  materialId: string;
  position: string;
  materialCategory: string;
  supplier: string;
  usage: {
    single: number;
    double: number;
    paired: number;
  };
};

const sampleRecommendation = {
  rows: [{
    materialId: 'M001',
    position: 'main',
    materialCategory: '油漆',
    supplier: '供应商A',
    usage: { single: 1, double: 2, paired: 3 },
  }],
  source: {
    type: 'published_formula',
    formulaKey: 'F20260427-0001',
    displayName: '推荐源配方',
  },
  confidence: 0.7,
  explanation: 'Draft candidates copied from a published formula.',
  warnings: [{ code: 'MATERIAL_NOT_FOUND', field: 'rows[0].materialId', message: 'review' }],
  readOnly: true,
  sideEffect: 'none',
} satisfies FormulaBomRecommendation<ContractRow>;

test('formula BOM recommendation contract keeps read-only response semantics', () => {
  assert.equal(sampleRecommendation.readOnly, true);
  assert.equal(sampleRecommendation.sideEffect, 'none');
  assert.equal(sampleRecommendation.source.type, 'published_formula');
  assert.equal(sampleRecommendation.warnings[0].code, 'MATERIAL_NOT_FOUND');
});
