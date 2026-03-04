const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tempDbPath = path.join(os.tmpdir(), `formula-workflow-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const { initDB, sequelize, Material } = require('../server/models');
const FormulaWorkflow = require('../server/services/formulas');

test.before(async () => {
  await initDB();
  await Material.create({
    code: 'M-001',
    name: '测试物料',
    unit: 'pcs',
    category: 'Raw'
  });
});

test('workflow handles revision conflict and rollback', async () => {
  const created = await FormulaWorkflow.createFormula({
    formulaKey: 'WF_TEST_001',
    displayName: '工作流测试配方',
    bom: [
      {
        materialId: 'M-001',
        position: 'main',
        materialCategory: '油漆',
        supplier: '供应商A',
        usage: { single: 1, double: 1.5, paired: 2 }
      }
    ],
    changeNote: 'create',
    operator: 'tester'
  });
  assert.equal(created.ok, true);
  assert.equal(created.revision.revision, 1);

  const conflict = await FormulaWorkflow.updateDraft('WF_TEST_001', {
    revision: 999,
    bom: [
      {
        materialId: 'M-001',
        position: 'main',
        materialCategory: '油漆',
        supplier: '供应商A',
        usage: { single: 1, double: 1, paired: 1 }
      }
    ],
    operator: 'tester'
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.status, 409);

  const updated = await FormulaWorkflow.updateDraft('WF_TEST_001', {
    revision: 1,
    bom: [
      {
        materialId: 'M-001',
        position: 'main',
        materialCategory: '油漆',
        supplier: '供应商A',
        usage: { single: 2, double: 2.5, paired: 3 }
      }
    ],
    changeNote: 'draft update',
    operator: 'tester'
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.revision.revision, 2);

  const published = await FormulaWorkflow.publish('WF_TEST_001', {
    fromRevision: 2,
    changeNote: 'publish',
    operator: 'tester'
  });
  assert.equal(published.ok, true);
  assert.equal(published.revision.revision, 3);

  const rolledBack = await FormulaWorkflow.rollback('WF_TEST_001', {
    targetRevision: 1,
    reason: 'rollback check',
    operator: 'tester'
  });
  assert.equal(rolledBack.ok, true);
  assert.equal(rolledBack.revision, 4);

  const publishedMap = await FormulaWorkflow.getPublishedFormulasMap();
  assert.ok(publishedMap.WF_TEST_001);
  assert.equal(publishedMap.WF_TEST_001.displayName, '工作流测试配方');
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
});
