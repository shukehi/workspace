const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const FORMULAS_FILE = path.join(__dirname, '../../public/data/color-formulas.json');

// Compatibility route for /api/formulas
router.get('/', (req, res) => {
    try {
        if (!fs.existsSync(FORMULAS_FILE)) return res.json([]);
        const data = fs.readFileSync(FORMULAS_FILE, 'utf8');
        res.header('Content-Type', 'application/json');
        res.send(data);
    } catch (e) {
        console.error('Read formulas failed', e);
        res.status(500).json({ error: 'Failed to read formulas' });
    }
});

router.post('/', (req, res) => {
    try {
        fs.writeFileSync(FORMULAS_FILE, JSON.stringify(req.body, null, 4));
        res.json({ success: true });
    } catch (e) {
        console.error('Write formulas failed', e);
        res.status(500).json({ error: 'Failed to save formulas' });
    }
});

module.exports = router;
