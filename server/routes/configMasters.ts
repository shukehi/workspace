import { Request, Response, Router } from 'express';
import { archiveSupplierMasterItem, createSupplierMasterItem, updateSupplierMasterItem } from '../services/config-platform/supplier-master.crud';
import { listSupplierMasterAuditLogs } from '../services/config-platform/supplier-master.audit';
import { getSupplierMasterDetail, listSupplierMasterLinkedMaterials, listSupplierMasterWithReadiness } from '../services/config-platform/supplier-master';
import { getMaterialMasterDetail, listMaterialMasterItems } from '../services/config-platform/material-master';
import materialService from '../services/MaterialService';
import { listMaterialMasterAuditLogs } from '../services/config-platform/material-master.audit';

const router: Router = Router();

router.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    const result = await listSupplierMasterWithReadiness();
    res.json({
      success: true,
      items: result.items,
      degradedProfiles: result.degradedProfiles,
      runtimeReadiness: result.runtimeReadiness,
      runtimeNotReady: result.runtimeNotReady,
    });
  } catch (error) {
    console.error('Error listing supplier master entries:', error);
    res.status(500).json({ success: false, error: 'Failed to list supplier master entries' });
  }
});

router.get('/suppliers/detail', async (_req: Request, res: Response) => {
  try {
    const detail = await getSupplierMasterDetail();
    res.json({
      success: true,
      detail,
      degradedProfiles: detail.degradedProfiles,
      runtimeReadiness: detail.runtimeReadiness,
      runtimeNotReady: detail.runtimeNotReady,
    });
  } catch (error) {
    console.error('Error reading supplier master detail:', error);
    res.status(500).json({ success: false, error: 'Failed to read supplier master detail' });
  }
});

router.post('/suppliers', async (req: Request, res: Response) => {
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

router.put('/suppliers/:id', async (req: Request, res: Response) => {
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

router.post('/suppliers/:id/archive', async (req: Request, res: Response) => {
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

router.get('/suppliers/audit-logs', async (_req: Request, res: Response) => {
  try {
    const items = await listSupplierMasterAuditLogs();
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error listing supplier master audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to list supplier master audit logs' });
  }
});

router.get('/suppliers/:id/materials', async (req: Request, res: Response) => {
  try {
    const items = await listSupplierMasterLinkedMaterials(req.params.id);
    res.json({ success: true, items, total: items.length });
  } catch (error) {
    console.error('Error listing supplier master linked materials:', error);
    res.status(500).json({ success: false, error: 'Failed to list supplier master linked materials' });
  }
});

router.get('/materials', async (req: Request, res: Response) => {
  try {
    const items = await listMaterialMasterItems(req.query.q as string | undefined);
    res.json({ success: true, items, total: items.length, page: 1, pageSize: items.length });
  } catch (error) {
    console.error('Error listing material master items:', error);
    res.status(500).json({ success: false, error: 'Failed to list material master items' });
  }
});

router.get('/materials/detail', async (_req: Request, res: Response) => {
  try {
    const detail = await getMaterialMasterDetail();
    res.json({ success: true, detail });
  } catch (error) {
    console.error('Error reading material master detail:', error);
    res.status(500).json({ success: false, error: 'Failed to read material master detail' });
  }
});

router.post('/materials', async (req: Request, res: Response) => {
  try {
    const item = await materialService.createMaterial(req.body || {});
    res.status(201).json({ success: true, item });
  } catch (error: any) {
    console.error('Error creating material master item:', error);
    res.status(error?.status || 500).json({ success: false, error: error?.message || 'Failed to create material master item' });
  }
});

router.put('/materials/:id', async (req: Request, res: Response) => {
  try {
    const item = await materialService.updateMaterial(Number(req.params.id), req.body || {});
    res.json({ success: true, item });
  } catch (error: any) {
    console.error('Error updating material master item:', error);
    res.status(error?.status || 500).json({ success: false, error: error?.message || 'Failed to update material master item' });
  }
});

router.get('/materials/audit-logs', async (_req: Request, res: Response) => {
  try {
    const items = await listMaterialMasterAuditLogs();
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error listing material master audit logs:', error);
    res.status(500).json({ success: false, error: 'Failed to list material master audit logs' });
  }
});

export default router;
