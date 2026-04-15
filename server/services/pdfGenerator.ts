/**
 * PDF Generator Service
 * Single-renderer implementation: capture /print-document via Puppeteer.
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'node:perf_hooks';
import puppeteer from 'puppeteer';
import { logger } from '../app/logger';

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

interface ScreenshotGenerationOptions {
    poNumber?: string;
    renderUrl?: string;
    [key: string]: unknown;
}

type RenderTrace = {
    poNumber: string;
    kind: 'pdf' | 'screenshot';
};

const BROWSER_IDLE_TIMEOUT_MS = 30_000;
const PRINT_RENDER_TIMEOUT_MS = 45_000;
const PRINT_READY_SELECTOR = '#printDocumentOutput .order-sheet';
const PRINT_ERROR_SELECTOR = '#printDocumentOutput .bg-rose-50';

let sharedBrowserPromise: Promise<Awaited<ReturnType<typeof puppeteer.launch>>> | null = null;
let activeBrowserSessions = 0;
let browserIdleTimer: NodeJS.Timeout | null = null;

function clearBrowserIdleTimer() {
    if (!browserIdleTimer) return;
    clearTimeout(browserIdleTimer);
    browserIdleTimer = null;
}

async function closeSharedBrowser() {
    const current = sharedBrowserPromise;
    sharedBrowserPromise = null;
    clearBrowserIdleTimer();
    if (!current) return;

    try {
        const browser = await current;
        if (browser.connected) {
            await browser.close();
        }
    } catch {
        // Ignore close races and launch failures.
    }
}

export async function shutdownPdfRenderer(): Promise<void> {
    await closeSharedBrowser();
}

function scheduleSharedBrowserClose() {
    clearBrowserIdleTimer();
    if (activeBrowserSessions > 0) return;
    browserIdleTimer = setTimeout(() => {
        void closeSharedBrowser();
    }, BROWSER_IDLE_TIMEOUT_MS);
}

async function getSharedBrowser() {
    clearBrowserIdleTimer();

    if (!sharedBrowserPromise) {
        sharedBrowserPromise = puppeteer.launch({
            headless: 'new' as unknown as boolean,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        sharedBrowserPromise.catch(() => {
            sharedBrowserPromise = null;
        });
    }

    const browser = await sharedBrowserPromise;
    if (!browser.connected) {
        sharedBrowserPromise = null;
        return getSharedBrowser();
    }

    return browser;
}

export async function prewarmPdfRenderer(): Promise<void> {
    const browser = await getSharedBrowser();
    activeBrowserSessions += 1;
    let page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>['newPage']>> | null = null;

    try {
        page = await browser.newPage();
        await page.goto('about:blank', {
            waitUntil: 'domcontentloaded',
            timeout: PRINT_RENDER_TIMEOUT_MS,
        });
    } finally {
        activeBrowserSessions = Math.max(0, activeBrowserSessions - 1);
        if (page) {
            try {
                await page.close();
            } catch {
                // Ignore close races during prewarm.
            }
        }
        scheduleSharedBrowserClose();
    }
}

async function withRenderPage<T>(
    renderUrl: string,
    mediaType: 'print' | 'screen',
    trace: RenderTrace,
    task: (page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteer.launch>>['newPage']>>) => Promise<T>,
): Promise<T> {
    const renderStart = performance.now();
    const browser = await getSharedBrowser();
    const browserReadyAt = performance.now();
    activeBrowserSessions += 1;
    const page = await browser.newPage();
    const pageReadyAt = performance.now();

    try {
        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 2
        });

        await page.goto(renderUrl, {
            waitUntil: 'domcontentloaded',
            timeout: PRINT_RENDER_TIMEOUT_MS
        });
        const domReadyAt = performance.now();

        await page.waitForFunction(
            ({ readySelector, errorSelector }) => Boolean(
                document.querySelector(readySelector) || document.querySelector(errorSelector)
            ),
            {
                timeout: PRINT_RENDER_TIMEOUT_MS,
            },
            {
                readySelector: PRINT_READY_SELECTOR,
                errorSelector: PRINT_ERROR_SELECTOR,
            },
        );
        const contentReadyAt = performance.now();

        const pageErrorText = await page.evaluate(({ errorSelector }) => {
            const errorNode = document.querySelector(errorSelector);
            return errorNode ? String(errorNode.textContent || '').trim() : '';
        }, {
            errorSelector: PRINT_ERROR_SELECTOR,
        });

        if (pageErrorText) {
            throw new Error(`Print document failed to render: ${pageErrorText}`);
        }

        await page.emulateMediaType(mediaType);
        await page.evaluateHandle('document.fonts ? document.fonts.ready : Promise.resolve()');
        const fontsReadyAt = performance.now();

        const result = await task(page);
        const taskDoneAt = performance.now();

        logger.info({
            pdfStage: 'render-page',
            pdfKind: trace.kind,
            poNumber: trace.poNumber,
            browserAcquireMs: Math.round(browserReadyAt - renderStart),
            pageCreateMs: Math.round(pageReadyAt - browserReadyAt),
            domContentLoadedMs: Math.round(domReadyAt - pageReadyAt),
            contentReadyMs: Math.round(contentReadyAt - domReadyAt),
            fontsReadyMs: Math.round(fontsReadyAt - contentReadyAt),
            renderTaskMs: Math.round(taskDoneAt - fontsReadyAt),
            totalMs: Math.round(taskDoneAt - renderStart),
        }, 'PDF render timings');

        return result;
    } finally {
        activeBrowserSessions = Math.max(0, activeBrowserSessions - 1);
        try {
            await page.close();
        } finally {
            scheduleSharedBrowserClose();
        }
    }
}

export async function generatePurchaseOrderPDF(options?: PdfGenerationOptions): Promise<Buffer> {
    const opts = (options && typeof options === 'object') ? options : {} as PdfGenerationOptions;
    const poNumber = String(opts.poNumber || 'order');
    const renderUrl = ensureRenderUrl(opts.renderUrl);
    const startedAt = performance.now();

    try {
        logger.info({ poNumber, renderUrl, pdfKind: 'pdf' }, 'Starting PDF generation');

        const pdfBuffer = await withRenderPage(renderUrl, 'print', { poNumber, kind: 'pdf' }, async (page) => {
            return await page.pdf({
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
        });

        if (process.env.PDF_DEBUG === '1') {
            const tempDir = path.join(__dirname, '../../temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempPath = path.join(tempDir, `${poNumber}_debug.pdf`);
            fs.writeFileSync(tempPath, pdfBuffer);
            logger.info({ poNumber, tempPath }, 'Saved debug PDF');
        }

        logger.info({
            poNumber,
            pdfKind: 'pdf',
            bytes: pdfBuffer.length,
            totalMs: Math.round(performance.now() - startedAt),
        }, 'PDF generated successfully');
        return Buffer.from(pdfBuffer);
    } catch (error: any) {
        logger.error({ err: error, poNumber, pdfKind: 'pdf' }, 'PDF generation failed');
        throw new Error(`PDF generation failed: ${error.message}`);
    }
}

export async function generatePurchaseOrderScreenshot(options?: ScreenshotGenerationOptions): Promise<Buffer> {
    const opts = (options && typeof options === 'object') ? options : {} as ScreenshotGenerationOptions;
    const poNumber = String(opts.poNumber || 'order');
    const renderUrl = ensureRenderUrl(opts.renderUrl);
    const startedAt = performance.now();

    try {
        logger.info({ poNumber, renderUrl, pdfKind: 'screenshot' }, 'Starting screenshot generation');

        const screenshot = await withRenderPage(renderUrl, 'screen', { poNumber, kind: 'screenshot' }, async (page) => {
            const screenshotTarget = await page.waitForSelector(PRINT_READY_SELECTOR, {
                timeout: 5_000,
            });
            if (!screenshotTarget) {
                throw new Error('Screenshot target not found');
            }

            return await screenshotTarget.screenshot({
                type: 'png',
                omitBackground: false,
            });
        });

        logger.info({
            poNumber,
            pdfKind: 'screenshot',
            bytes: screenshot.length,
            totalMs: Math.round(performance.now() - startedAt),
        }, 'Screenshot generated successfully');
        return Buffer.from(screenshot);
    } catch (error: any) {
        logger.error({ err: error, poNumber, pdfKind: 'screenshot' }, 'Screenshot generation failed');
        throw new Error(`Screenshot generation failed: ${error.message}`);
    }
}
