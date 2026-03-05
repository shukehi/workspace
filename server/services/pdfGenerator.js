/**
 * PDF Generator Service
 * Single-renderer implementation: capture /print-document via Puppeteer.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function ensureRenderUrl(renderUrl) {
    if (!renderUrl || typeof renderUrl !== 'string') {
        throw new Error('Missing renderUrl for PDF generation');
    }

    try {
        const parsed = new URL(renderUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Only http/https renderUrl is allowed');
        }
        return parsed.toString();
    } catch (error) {
        throw new Error(`Invalid renderUrl: ${error.message}`);
    }
}

async function generatePurchaseOrderPDF(options) {
    const opts = (options && typeof options === 'object') ? options : {};
    const poNumber = String(opts.poNumber || 'order');
    const renderUrl = ensureRenderUrl(opts.renderUrl);

    let browser;
    try {
        console.log(`📄 Starting PDF generation for ${poNumber}`);
        console.log(`🔗 Render source: ${renderUrl}`);

        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 2
        });

        await page.goto(renderUrl, {
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 45_000
        });

        await page.emulateMediaType('print');
        await page.evaluateHandle('document.fonts ? document.fonts.ready : Promise.resolve()');

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            preferCSSPageSize: true,
            displayHeaderFooter: false
        });

        if (process.env.PDF_DEBUG !== '0') {
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempPath = path.join(tempDir, `${poNumber}_debug.pdf`);
            fs.writeFileSync(tempPath, pdfBuffer);
            console.log(`🔍 Debug PDF saved: ${tempPath}`);
        }

        console.log(`✅ PDF generated successfully for ${poNumber} (${pdfBuffer.length} bytes)`);
        return pdfBuffer;
    } catch (error) {
        console.error('❌ PDF generation failed:', error);
        throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {
    generatePurchaseOrderPDF
};
