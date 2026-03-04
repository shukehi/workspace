const express = require('express');
const router = express.Router();
const contractCacheService = require('../services/ContractCacheService');

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

module.exports = router;
