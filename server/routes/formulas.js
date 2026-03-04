const express = require('express');
const FormulaService = require('../services/FormulaService');

const router = express.Router();

// Compatibility route for /api/formulas
router.get('/', async (req, res) => {
    try {
        console.warn('[DEPRECATED] /api/formulas is called. Please migrate to /api/config/formulas');
        const payload = await FormulaService.getPublishedFormulasMap();
        res.setHeader('X-API-Deprecated', 'true');
        res.setHeader('X-API-Deprecated-Message', 'Use /api/config/formulas instead.');
        res.header('Content-Type', 'application/json');
        res.json(payload);
    } catch (e) {
        console.error('Read formulas failed', e);
        res.status(500).json({ error: 'Failed to read formulas' });
    }
});

router.post('/', (req, res) => {
    res.status(405).json({
        success: false,
        error: 'Deprecated endpoint is read-only. Use /api/config/formulas.'
    });
});

module.exports = router;
