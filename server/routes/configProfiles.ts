import { Request, Response, Router } from 'express';
import * as FormulaService from '../services/formulas';
import materialService from '../services/MaterialService';
import { archiveSupplierMasterItem, createSupplierMasterItem, updateSupplierMasterItem } from '../services/config-platform/supplier-master.crud';
import { listSupplierMasterLinkedMaterials } from '../services/config-platform/supplier-master';
import {
  getConfigProfileDetail,
  listConfigProfileAuditLogs,
  listConfigProfileRevisions,
  listConfigProfiles,
  publishConfigProfile,
  rollbackConfigProfile,
  updateConfigProfileDraft,
} from '../services/config-platform/profile.service';
import { getConfigProfileDiff } from '../services/config-platform/profile.diff';
import { getConfigProfileImpactSummary } from '../services/config-platform/profile.impact';
import { getConfigProfileReplay } from '../services/config-platform/profile.replay';
import { getConfigProfileReferenceCheck } from '../services/config-platform/profile.reference-check';
import {
  FORMULA_BOM_MATERIAL_CATEGORIES,
  FORMULA_BOM_MATERIAL_CATEGORY_LABEL,
} from '@/shared/types/formulaBom';

const router: Router = Router();
const MAX_FORMULA_RECOMMENDATION_SOURCE_KEY_LENGTH = 128;

function operatorFromRequest(req: Request) {
  return String(req.headers['x-operator'] || req.headers['x-user'] || 'system-admin');
}

function sendWorkflowResult(res: Response, result: Awaited<ReturnType<typeof getConfigProfileDetail>>) {
  if (!result.ok) {
    res.status(Number(result.status) || 500).json({
      success: false,
      errors: result.errors || [],
      latestRevision: result.latestRevision ?? null,
      activeRevision: result.activeRevision ?? null,
    });
    return;
  }
  res.json({ success: true, ...result });
}

router.get('/formulas/items', async (req: Request, res: Response) => {
  try {
    const result = await FormulaService.listFormulas({
      keyword: req.query.keyword as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error listing formula profile items:', error);
    res.status(500).json({ success: false, error: 'Failed to list formula profile items' });
  }
});

router.get('/formulas/metadata', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    metadata: {
      materialCategories: [...FORMULA_BOM_MATERIAL_CATEGORIES],
      materialCategoryLabel: FORMULA_BOM_MATERIAL_CATEGORY_LABEL,
      readOnly: true,
      sideEffect: 'none',
    },
  });
});

router.get('/formulas/bom-recommendations', async (req: Request, res: Response) => {
  try {
    const sourceFormulaKey = typeof req.query.sourceFormulaKey === 'string'
      ? req.query.sourceFormulaKey
      : undefined;
    if (sourceFormulaKey && sourceFormulaKey.length > MAX_FORMULA_RECOMMENDATION_SOURCE_KEY_LENGTH) {
      res.status(400).json({ success: false, error: 'sourceFormulaKey is too long' });
      return;
    }

    const recommendation = await FormulaService.recommendFormulaBom({
      sourceFormulaKey,
    });
    res.json({ success: true, recommendation });
  } catch (error) {
    console.error('Error reading formula BOM recommendations:', error);
    res.status(500).json({ success: false, error: 'Failed to read formula BOM recommendations' });
  }
});

router.get('/material_master/items', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string | undefined;
    const items = query
      ? await materialService.searchMaterials(query)
      : await materialService.getAllMaterials();
    res.json({ success: true, items, total: items.length, page: 1, pageSize: items.length });
  } catch (error) {
    console.error('Error listing material master items:', error);
    res.status(500).json({ success: false, error: 'Failed to list material master items' });
  }
});

router.get('/supplier_master/items', async (_req: Request, res: Response) => {
  try {
    const detail = await getConfigProfileDetail('supplier_master');
    if (!detail.ok || !detail.detail) {
      sendWorkflowResult(res, detail as any);
      return;
    }
    const runtimeReadiness = detail.detail.collection?.runtimeReadiness;
    const runtimeNotReady = detail.detail.collection?.runtimeNotReady;
    const degradedProfiles = detail.detail.collection?.degradedProfiles;
    res.json({
      success: true,
      items: detail.detail.collection?.previewItems || [],
      total: detail.detail.collection?.total || 0,
      page: 1,
      pageSize: detail.detail.collection?.pageSize || 0,
      degradedProfiles,
      runtimeReadiness,
      runtimeNotReady,
    });
  } catch (error) {
    console.error('Error listing supplier master items:', error);
    res.status(500).json({ success: false, error: 'Failed to list supplier master items' });
  }
});

router.get('/supplier_master/items/:id/materials', async (req: Request, res: Response) => {
  try {
    const items = await listSupplierMasterLinkedMaterials(req.params.id);
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    console.error('Error listing supplier master linked materials:', error);
    res.status(500).json({ success: false, error: 'Failed to list supplier master linked materials' });
  }
});

router.post('/material_master/items', async (req: Request, res: Response) => {
  try {
    const item = await materialService.createMaterial(req.body || {});
    res.status(201).json({ success: true, item });
  } catch (error: any) {
    console.error('Error creating material master item:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to create material master item' });
  }
});

router.post('/supplier_master/items', async (req: Request, res: Response) => {
  try {
    const result = await createSupplierMasterItem(req.body || {});
    if (!result.ok) {
      res.status(result.status || 500).json({ success: false, errors: result.errors || [] });
      return;
    }
    res.status(201).json({ success: true, item: result.item });
  } catch (error) {
    console.error('Error creating supplier master item:', error);
    res.status(500).json({ success: false, error: 'Failed to create supplier master item' });
  }
});

router.put('/material_master/items/:id', async (req: Request, res: Response) => {
  try {
    const item = await materialService.updateMaterial(Number(req.params.id), req.body || {});
    res.json({ success: true, item });
  } catch (error: any) {
    console.error('Error updating material master item:', error);
    res.status(error?.status || 500).json({ success: false, error: error?.message || 'Failed to update material master item' });
  }
});

router.put('/supplier_master/items/:id', async (req: Request, res: Response) => {
  try {
    const result = await updateSupplierMasterItem(req.params.id, req.body || {});
    if (!result.ok) {
      res.status(result.status || 500).json({ success: false, errors: result.errors || [] });
      return;
    }
    res.json({ success: true, item: result.item });
  } catch (error) {
    console.error('Error updating supplier master item:', error);
    res.status(500).json({ success: false, error: 'Failed to update supplier master item' });
  }
});

router.post('/supplier_master/items/:id/archive', async (req: Request, res: Response) => {
  try {
    const result = await archiveSupplierMasterItem(req.params.id);
    if (!result.ok) {
      res.status(result.status || 500).json({ success: false, errors: result.errors || [] });
      return;
    }
    res.json({ success: true, item: result.item });
  } catch (error) {
    console.error('Error archiving supplier master item:', error);
    res.status(500).json({ success: false, error: 'Failed to archive supplier master item' });
  }
});

router.get('/formulas/items/:formulaKey', async (req: Request, res: Response) => {
  try {
    const detail = await FormulaService.getFormulaDetail(req.params.formulaKey);
    if (!detail) {
      res.status(404).json({ success: false, error: 'Formula not found' });
      return;
    }
    res.json({ success: true, ...detail });
  } catch (error) {
    console.error('Error reading formula profile item detail:', error);
    res.status(500).json({ success: false, error: 'Failed to read formula profile item detail' });
  }
});

router.post('/formulas/items', async (req: Request, res: Response) => {
  try {
    const result = await FormulaService.createFormula({
      formulaKey: String(req.body?.formulaKey || '').trim(),
      displayName: String(req.body?.displayName || '').trim(),
      bom: Array.isArray(req.body?.bom) ? req.body.bom : [],
      changeNote: req.body?.changeNote,
      operator: operatorFromRequest(req)
    });
    if (!result.ok) {
      res.status(result.status).json({ success: false, errors: result.errors || [] });
      return;
    }
    const def = result.definition ?? {};
    res.status(201).json({
      success: true,
      formula: {
        formulaKey: def['formula_key'],
        displayName: def['display_name'],
        status: def['status'],
        activeRevision: def['active_revision']
      },
      revision: FormulaService.toRevisionMeta(result.revision ?? {})
    });
  } catch (error) {
    console.error('Error creating formula profile item:', error);
    res.status(500).json({ success: false, error: 'Failed to create formula profile item' });
  }
});

router.put('/formulas/items/:formulaKey/draft', async (req: Request, res: Response) => {
  try {
    const result = await FormulaService.updateDraft(req.params.formulaKey, {
      revision: req.body?.revision,
      formulaKey: req.body?.formulaKey,
      displayName: req.body?.displayName,
      bom: Array.isArray(req.body?.bom) ? req.body.bom : [],
      changeNote: req.body?.changeNote,
      operator: operatorFromRequest(req)
    });
    if (!result.ok) {
      res.status(result.status).json({
        success: false,
        errors: result.errors || [],
        latestRevision: result.latestRevision ?? null
      });
      return;
    }
    res.json({ success: true, revision: FormulaService.toRevisionMeta(result.revision ?? {}) });
  } catch (error) {
    console.error('Error updating formula profile item draft:', error);
    res.status(500).json({ success: false, error: 'Failed to update formula profile item draft' });
  }
});

router.post('/formulas/items/:formulaKey/publish', async (req: Request, res: Response) => {
  try {
    const result = await FormulaService.publish(req.params.formulaKey, {
      fromRevision: req.body?.fromRevision,
      changeNote: req.body?.changeNote,
      operator: operatorFromRequest(req)
    });
    if (!result.ok) {
      res.status(result.status).json({ success: false, errors: result.errors || [] });
      return;
    }
    res.json({ success: true, revision: FormulaService.toRevisionMeta(result.revision ?? {}) });
  } catch (error) {
    console.error('Error publishing formula profile item:', error);
    res.status(500).json({ success: false, error: 'Failed to publish formula profile item' });
  }
});

router.post('/formulas/items/:formulaKey/archive', async (req: Request, res: Response) => {
  try {
    const result = await FormulaService.archive(req.params.formulaKey, {
      reason: req.body?.reason,
      operator: operatorFromRequest(req)
    });
    if (!result.ok) {
      res.status(result.status).json({ success: false, errors: result.errors || [] });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving formula profile item:', error);
    res.status(500).json({ success: false, error: 'Failed to archive formula profile item' });
  }
});

router.post('/formulas/items/:formulaKey/rollback', async (req: Request, res: Response) => {
  try {
    const result = await FormulaService.rollback(req.params.formulaKey, {
      targetRevision: req.body?.targetRevision,
      reason: req.body?.reason,
      operator: operatorFromRequest(req)
    });
    if (!result.ok) {
      res.status(result.status).json({ success: false, errors: result.errors || [] });
      return;
    }
    res.json({ success: true, revision: result.revision });
  } catch (error) {
    console.error('Error rolling back formula profile item:', error);
    res.status(500).json({ success: false, error: 'Failed to rollback formula profile item' });
  }
});

router.delete('/formulas/items/:formulaKey', async (req: Request, res: Response) => {
  try {
    const result = await FormulaService.remove(req.params.formulaKey);
    if (!result.ok) {
      res.status(result.status).json({ success: false, errors: result.errors || [] });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting formula profile item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete formula profile item' });
  }
});

router.get('/formulas/items/:formulaKey/revisions', async (req: Request, res: Response) => {
  try {
    const revisions = await FormulaService.listRevisions(req.params.formulaKey);
    if (!revisions) {
      res.status(404).json({ success: false, error: 'Formula not found' });
      return;
    }
    res.json({ success: true, items: revisions });
  } catch (error) {
    console.error('Error listing formula profile item revisions:', error);
    res.status(500).json({ success: false, error: 'Failed to list formula profile item revisions' });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await listConfigProfiles();
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error listing config profiles:', error);
    res.status(500).json({ success: false, error: 'Failed to list config profiles' });
  }
});

router.get('/:code', async (req: Request, res: Response) => {
  try {
    const result = await getConfigProfileDetail(req.params.code);
    if (!result.ok) {
      sendWorkflowResult(res, result);
      return;
    }
    res.json({ success: true, profile: result.profile });
  } catch (error) {
    console.error('Error reading config profile summary:', error);
    res.status(500).json({ success: false, error: 'Failed to read config profile summary' });
  }
});

router.get('/:code/detail', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await getConfigProfileDetail(req.params.code));
  } catch (error) {
    console.error('Error reading config profile detail:', error);
    res.status(500).json({ success: false, error: 'Failed to read config profile detail' });
  }
});

router.get('/:code/diff', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await getConfigProfileDiff(req.params.code) as any);
  } catch (error) {
    console.error('Error reading config profile diff:', error);
    res.status(500).json({ success: false, error: 'Failed to read config profile diff' });
  }
});

router.get('/:code/impact', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await getConfigProfileImpactSummary(req.params.code) as any);
  } catch (error) {
    console.error('Error reading config profile impact summary:', error);
    res.status(500).json({ success: false, error: 'Failed to read config profile impact summary' });
  }
});

router.get('/:code/replay', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await getConfigProfileReplay(req.params.code) as any);
  } catch (error) {
    console.error('Error reading config profile replay summary:', error);
    res.status(500).json({ success: false, error: 'Failed to read config profile replay summary' });
  }
});

router.get('/:code/reference-check', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await getConfigProfileReferenceCheck(req.params.code) as any);
  } catch (error) {
    console.error('Error reading config profile reference check:', error);
    res.status(500).json({ success: false, error: 'Failed to read config profile reference check' });
  }
});

router.put('/:code/draft', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await updateConfigProfileDraft(req.params.code, {
      revision: req.body?.revision,
      payload: req.body?.payload,
      changeNote: req.body?.changeNote,
      schemaVersion: req.body?.schemaVersion,
      operator: operatorFromRequest(req),
    }));
  } catch (error) {
    console.error('Error updating config profile draft:', error);
    res.status(500).json({ success: false, error: 'Failed to update config profile draft' });
  }
});

router.post('/:code/publish', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await publishConfigProfile(req.params.code, {
      fromRevision: req.body?.fromRevision,
      changeNote: req.body?.changeNote,
      operator: operatorFromRequest(req),
    }));
  } catch (error) {
    console.error('Error publishing config profile:', error);
    res.status(500).json({ success: false, error: 'Failed to publish config profile' });
  }
});

router.post('/:code/rollback', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await rollbackConfigProfile(req.params.code, {
      targetRevision: req.body?.targetRevision,
      reason: req.body?.reason,
      operator: operatorFromRequest(req),
    }));
  } catch (error) {
    console.error('Error rolling back config profile:', error);
    res.status(500).json({ success: false, error: 'Failed to rollback config profile' });
  }
});

router.get('/:code/revisions', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await listConfigProfileRevisions(req.params.code));
  } catch (error) {
    console.error('Error listing config profile revisions:', error);
    res.status(500).json({ success: false, error: 'Failed to list config profile revisions' });
  }
});

router.get('/:code/audit-logs', async (req: Request, res: Response) => {
  try {
    sendWorkflowResult(res, await listConfigProfileAuditLogs(req.params.code));
  } catch (error) {
    console.error('Error listing config profile audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to list config profile audit logs' });
  }
});

export default router;
