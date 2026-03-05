/**
 * PDF Generation Routes
 * Handles PDF export requests
 */

const express = require('express');
const { generatePurchaseOrderPDF } = require('../services/pdfGenerator');

const router = express.Router();

/**
 * POST /api/pdf/generate
 * Generate PDF from order data
 *
 * Request body:
 * {
 *   poNumber: string,
 *   category?: string,
 *   order: Object (with customerName, code, list, etc.)
 * }
 */
router.post('/generate', async (req, res) => {
    try {
        const { poNumber, order, category } = req.body;

        // Validate request
        if (!poNumber || !order) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: poNumber and order'
            });
        }

        if (!order.list || !Array.isArray(order.list)) {
            return res.status(400).json({
                success: false,
                error: 'Order must include a valid items list'
            });
        }

        console.log(`📄 Received PDF generation request for ${poNumber}`);

        // Generate PDF
        const pdfBuffer = await generatePurchaseOrderPDF(order, poNumber, category);

        // Set response headers for binary PDF data
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(poNumber)}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF as raw binary buffer (use end() instead of send() to avoid charset encoding)
        res.end(pdfBuffer, 'binary');

        console.log(`✅ PDF sent successfully for ${poNumber}`);

    } catch (error) {
        console.error('❌ PDF generation error:', error);
        res.status(500).json({
            success: false,
            error: 'PDF generation failed',
            message: error.message
        });
    }
});

module.exports = router;
