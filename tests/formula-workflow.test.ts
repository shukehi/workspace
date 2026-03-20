import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

const tempDbPath = path.join(os.tmpdir(), `formula-workflow-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const { initDB, sequelize, Material } = require('../server/models') as typeof import('../server/models');
const FormulaWorkflow = require('../server/services/formulas') as typeof import('../server/services/formulas');
const FormulaRepository = (require('../server/services/formulas/formula.repository') as typeof import('../server/services/formulas/formula.repository')).default;

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
  }) as any;
  assert.equal(created.ok, true);
  assert.equal(created.revision.revision, 1);
  const formulaKey = created.definition.formula_key;
  assert.match(formulaKey, /^F\d{8}-\d{4}$/);

  const conflict = await FormulaWorkflow.updateDraft(formulaKey, {
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

  const updated = await FormulaWorkflow.updateDraft(formulaKey, {
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
  }) as any;
  assert.equal(updated.ok, true);
  assert.equal(updated.revision.revision, 2);

  const published = await FormulaWorkflow.publish(formulaKey, {
    fromRevision: 2,
    changeNote: 'publish',
    operator: 'tester'
  }) as any;
  assert.equal(published.ok, true);
  assert.equal(published.revision.revision, 3);

  const rolledBack = await FormulaWorkflow.rollback(formulaKey, {
    targetRevision: 1,
    reason: 'rollback check',
    operator: 'tester'
  });
  assert.equal(rolledBack.ok, true);
  assert.equal(rolledBack.revision, 4);

  const publishedMap = await FormulaWorkflow.getPublishedFormulasMap();
  assert.ok(publishedMap[formulaKey]);
  assert.equal(publishedMap[formulaKey].displayName, '工作流测试配方');
  assert.ok(publishedMap['工作流测试配方']);

  const archived = await FormulaWorkflow.archive(formulaKey, {
    reason: 'archive for published-map filter check',
    operator: 'tester'
  });
  assert.equal(archived.ok, true);

  const archivedMap = await FormulaWorkflow.getPublishedFormulasMap();
  assert.equal(archivedMap[formulaKey], undefined);
});

test('createFormula retries when sqlite is busy', async () => {
  const originalWithTransaction = FormulaRepository.withTransaction;
  let attempts = 0;

  (FormulaRepository as any).withTransaction = async (handler: unknown) => {
    attempts += 1;
    if (attempts === 1) {
      const busyError = new Error('SQLITE_BUSY: database is locked') as Error & { name: string; original: { code: string; message: string } };
      busyError.name = 'SequelizeTimeoutError';
      busyError.original = { code: 'SQLITE_BUSY', message: 'SQLITE_BUSY: database is locked' };
      throw busyError;
    }
    return originalWithTransaction.call(FormulaRepository, handler as any);
  };

  try {
    const created = await FormulaWorkflow.createFormula({
      displayName: 'BUSY重试测试',
      bom: [
        {
          materialId: 'M-001',
          position: 'main',
          materialCategory: '油漆',
          supplier: '供应商A',
          usage: { single: 1, double: 1, paired: 1 }
        }
      ],
      changeNote: 'busy retry',
      operator: 'tester'
    });

    assert.equal(created.ok, true);
    assert.ok(attempts >= 2);
  } finally {
    FormulaRepository.withTransaction = originalWithTransaction;
  }
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
});
