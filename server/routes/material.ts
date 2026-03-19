import { Request, Response, Router } from 'express';
import materialService from '../services/MaterialService';

const router: Router = Router();

// GET /api/materials?q=...
router.get('/', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string | undefined;
        const materials = await materialService.searchMaterials(query);
        res.json(materials);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/materials
router.post('/', async (req: Request, res: Response) => {
    try {
        const material = await materialService.createMaterial(req.body);
        res.json(material);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/materials/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const material = await materialService.updateMaterial(Number(req.params.id), req.body);
        res.json(material);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
