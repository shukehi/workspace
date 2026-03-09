const express = require('express');
const router = express.Router();
const contractCacheService = require('../services/ContractCacheService');

function isSqliteReadonlyError(err) {
    if (!err) return false;
    const msg = String(err.message || '');
    const code = String(err.code || err?.original?.code || '');
    return msg.includes('SQLITE_READONLY') || code === 'SQLITE_READONLY';
}

// GET /api/contracts
router.get('/', async (req, res) => {
    try {
        const result = await contractCacheService.listContracts(req.query);
        res.json({
            success: true,
            ...result
        });
    } catch (e) {
        console.error('List cached contracts failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/contracts/cache
router.post('/cache', async (req, res) => {
    try {
        const result = await contractCacheService.cacheContract(req.body);
        res.json({
            success: true,
            status: result.status,
            contract_code: result.contract.contract_code,
            payload_hash: result.contract.payload_hash,
            last_fetched_at: result.contract.last_fetched_at
        });
    } catch (e) {
        if (e.message === 'INVALID_PAYLOAD' || e.message === 'MISSING_CONTRACT_CODE') {
            return res.status(400).json({ success: false, error: e.message });
        }
        if (isSqliteReadonlyError(e)) {
            console.warn('Cache contract skipped due to readonly database:', e.message);
            return res.status(200).json({
                success: true,
                status: 'skipped_readonly',
                warning: 'SQLITE_READONLY'
            });
        }
        console.error('Cache contract failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/contracts/:code
router.get('/:code', async (req, res) => {
    try {
        const cached = await contractCacheService.getByCode(req.params.code);
        if (!cached) return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        res.json({
            success: true,
            data: cached
        });
    } catch (e) {
        console.error('Get cached contract failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/contracts/:code
router.delete('/:code', async (req, res) => {
    try {
        await contractCacheService.deleteByCode(req.params.code);
        res.json({ success: true });
    } catch (e) {
        if (e.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'NOT_FOUND' });
        console.error('Delete cached contract failed', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
