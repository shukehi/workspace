/**
 * PDF Generator Service
 * Single-renderer implementation: capture /print-document via Puppeteer.
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

function ensureRenderUrl(renderUrl: unknown): string {
    if (!renderUrl || typeof renderUrl !== 'string') {
        throw new Error('Missing renderUrl for PDF generation');
    }

    try {
        const parsed = new URL(renderUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('Only http/https renderUrl is allowed');
        }
        return parsed.toString();
    } catch (error: any) {
        throw new Error(`Invalid renderUrl: ${error.message}`);
    }
}

interface PdfGenerationOptions {
    poNumber?: string;
    renderUrl?: string;
    [key: string]: unknown;
}

export async function generatePurchaseOrderPDF(options?: PdfGenerationOptions): Promise<Buffer> {
    const opts = (options && typeof options === 'object') ? options : {} as PdfGenerationOptions;
    const poNumber = String(opts.poNumber || 'order');
    const renderUrl = ensureRenderUrl(opts.renderUrl);

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
    try {
        console.log(`📄 Starting PDF generation for ${poNumber}`);
        console.log(`🔗 Render source: ${renderUrl}`);

        browser = await puppeteer.launch({
            headless: 'new' as unknown as boolean, // Puppeteer ≥21 'new' headless mode; type def still says boolean
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

        if (process.env.PDF_DEBUG === '1') {
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempPath = path.join(tempDir, `${poNumber}_debug.pdf`);
            fs.writeFileSync(tempPath, pdfBuffer);
            console.log(`🔍 Debug PDF saved: ${tempPath}`);
        }

        console.log(`✅ PDF generated successfully for ${poNumber} (${pdfBuffer.length} bytes)`);
        return Buffer.from(pdfBuffer);
    } catch (error: any) {
        console.error('❌ PDF generation failed:', error);
        throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

