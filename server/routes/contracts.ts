import { Request, Response, Router } from 'express';
import contractCacheService, { type ListContractsQuery } from '../services/ContractCacheService';

const router: Router = Router();

function isSqliteReadonlyError(err: any): boolean {
    if (!err) return false;
    const msg = String(err.message || '');
    const code = String(err.code || err?.original?.code || '');
    return msg.includes('SQLITE_READONLY') || code === 'SQLITE_READONLY';
}

// GET /api/contracts
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await contractCacheService.listContracts(req.query as ListContractsQuery);
        res.json({
            success: true,
            ...result
        });
    } catch (e: any) {
        console.error('List cached contracts failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/contracts/cache
router.post('/cache', async (req: Request, res: Response) => {
    try {
        const result = await contractCacheService.cacheContract(req.body);
        res.json({
            success: true,
            status: result.status,
            contract_code: result.contract.contract_code,
            payload_hash: result.contract.payload_hash,
            last_fetched_at: result.contract.last_fetched_at
        });
    } catch (e: any) {
        if (e.message === 'INVALID_PAYLOAD' || e.message === 'MISSING_CONTRACT_CODE') {
            res.status(400).json({ success: false, error: e.message });
            return;
        }
        if (isSqliteReadonlyError(e)) {
            console.warn('Cache contract skipped due to readonly database:', e.message);
            res.status(200).json({
                success: true,
                status: 'skipped_readonly',
                warning: 'SQLITE_READONLY'
            });
            return;
        }
        console.error('Cache contract failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/contracts/:code
router.get('/:code', async (req: Request, res: Response) => {
    try {
        const cached = await contractCacheService.getByCode(req.params.code);
        if (!cached) {
            res.status(404).json({ success: false, error: 'NOT_FOUND' });
            return;
        }
        res.json({
            success: true,
            data: cached
        });
    } catch (e: any) {
        console.error('Get cached contract failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/contracts/:code
router.delete('/:code', async (req: Request, res: Response) => {
    try {
        await contractCacheService.deleteByCode(req.params.code);
        res.json({ success: true });
    } catch (e: any) {
        if (e.message === 'NOT_FOUND') {
            res.status(404).json({ success: false, error: 'NOT_FOUND' });
            return;
        }
        console.error('Delete cached contract failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
