import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url);
const tempDbPath = path.join(os.tmpdir(), `test-formula-workflow-${crypto.randomBytes(8).toString('hex')}.sqlite`);

// Purge cache and set environment before requiring models
const purgeDatabaseCache = () => {
  Object.keys(_require.cache).forEach((key) => {
    if (key.includes('/server/config/database') || key.includes('/server/models/')) {
      delete _require.cache[key];
    }
  });
};
purgeDatabaseCache();
process.env.DB_STORAGE = tempDbPath;

const { initDB, sequelize, Material, FormulaDefinition, FormulaRevision, FormulaAuditLog } = _require('../server/models') as typeof import('../server/models');
const FormulaWorkflow = _require('../server/services/formulas') as typeof import('../server/services/formulas');
const FormulaRepository = (_require('../server/services/formulas/formula.repository') as typeof import('../server/services/formulas/formula.repository')).default;

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

test('recommendFormulaBom returns read-only recommendation metadata from a published formula', async () => {
  const created = await FormulaWorkflow.createFormula({
    displayName: '推荐来源配方',
    bom: [
      {
        materialId: 'M-001',
        position: 'main',
        materialCategory: '油漆',
        supplier: '供应商A',
        usage: { single: 1, double: 2, paired: 3 }
      }
    ],
    changeNote: 'recommendation source create',
    operator: 'tester'
  }) as any;
  assert.equal(created.ok, true);
  const formulaKey = created.definition.formula_key;

  const published = await FormulaWorkflow.publish(formulaKey, {
    fromRevision: created.revision.revision,
    changeNote: 'recommendation source publish',
    operator: 'tester'
  }) as any;
  assert.equal(published.ok, true);

  const definitionsBefore = await FormulaDefinition.count();
  const revisionsBefore = await FormulaRevision.count();
  const auditLogsBefore = await FormulaAuditLog.count();
  const recommendation = await FormulaWorkflow.recommendFormulaBom({ sourceFormulaKey: formulaKey });
  const definitionsAfter = await FormulaDefinition.count();
  const revisionsAfter = await FormulaRevision.count();
  const auditLogsAfter = await FormulaAuditLog.count();

  assert.equal(definitionsAfter, definitionsBefore);
  assert.equal(revisionsAfter, revisionsBefore);
  assert.equal(auditLogsAfter, auditLogsBefore);
  assert.equal(recommendation.readOnly, true);
  assert.equal(recommendation.sideEffect, 'none');
  assert.equal(recommendation.source.type, 'published_formula');
  assert.equal(recommendation.source.formulaKey, formulaKey);
  assert.equal(recommendation.rows.length, 1);
  assert.equal(recommendation.rows[0].materialId, 'M-001');
  assert.equal(recommendation.rows[0].usage.paired, 3);
  assert.ok(recommendation.confidence > 0);
  assert.match(recommendation.explanation, /published formula/i);
  assert.deepEqual(recommendation.warnings, []);

  const updated = await FormulaWorkflow.updateDraft(formulaKey, {
    revision: published.revision.revision,
    bom: recommendation.rows,
    changeNote: 'recommendation rows still pass normal draft validation',
    operator: 'tester'
  });
  assert.equal(updated.ok, true);
});

test('recommendFormulaBom does not read from unpublished draft formulas', async () => {
  const created = await FormulaWorkflow.createFormula({
    displayName: '未发布推荐来源配方',
    bom: [
      {
        materialId: 'M-001',
        position: 'main',
        materialCategory: '油漆',
        supplier: '供应商A',
        usage: { single: 1, double: 1, paired: 1 }
      }
    ],
    changeNote: 'draft-only recommendation source',
    operator: 'tester'
  }) as any;
  assert.equal(created.ok, true);

  const definitionsBefore = await FormulaDefinition.count();
  const revisionsBefore = await FormulaRevision.count();
  const auditLogsBefore = await FormulaAuditLog.count();
  const recommendation = await FormulaWorkflow.recommendFormulaBom({ sourceFormulaKey: created.definition.formula_key });

  assert.equal(await FormulaDefinition.count(), definitionsBefore);
  assert.equal(await FormulaRevision.count(), revisionsBefore);
  assert.equal(await FormulaAuditLog.count(), auditLogsBefore);
  assert.equal(recommendation.readOnly, true);
  assert.equal(recommendation.sideEffect, 'none');
  assert.equal(recommendation.source.type, 'none');
  assert.equal(recommendation.confidence, 0);
  assert.deepEqual(recommendation.rows, []);
  assert.ok(recommendation.warnings.some((warning: any) => warning.code === 'SOURCE_NOT_FOUND'));
});

test('recommendFormulaBom degrades safely when no source is selected', async () => {
  const recommendation = await FormulaWorkflow.recommendFormulaBom();

  assert.equal(recommendation.readOnly, true);
  assert.equal(recommendation.sideEffect, 'none');
  assert.equal(recommendation.source.type, 'none');
  assert.equal(recommendation.confidence, 0);
  assert.deepEqual(recommendation.rows, []);
  assert.ok(recommendation.warnings.some((warning: any) => warning.code === 'NO_SOURCE'));
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
});
