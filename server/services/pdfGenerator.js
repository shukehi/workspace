/**
 * PDF Generator Service
 * Uses Puppeteer to generate high-quality PDFs from HTML
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Basic HTML escape to avoid breaking table markup when injecting text
function escapeHTML(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Load packaging mapping configuration
let packagingConfig = null;
function loadPackagingConfig() {
    if (!packagingConfig) {
        try {
            const configPath = path.join(__dirname, '../../public/data/packaging-mapping.json');
            const configData = fs.readFileSync(configPath, 'utf-8');
            packagingConfig = JSON.parse(configData);
            console.log('✅ Packaging config loaded:', packagingConfig.supplierName);
        } catch (error) {
            console.warn('⚠️ Failed to load packaging config, using defaults:', error.message);
            packagingConfig = {
                supplierName: '默认供应商',
                mappings: {}
            };
        }
    }
    return packagingConfig;
}

// Load CSS from frontend
// In development, always reload CSS to reflect changes immediately
function loadPrintCSS() {
    try {
        // Load variables.css for CSS variables (fonts, colors, etc.)
        const variablesPath = path.join(__dirname, '../../public/css/core/variables.css');
        const variablesCSS = fs.readFileSync(variablesPath, 'utf-8');

        // Load print.css for print-specific styles
        const printPath = path.join(__dirname, '../../public/css/pages/print.css');
        const printCSS = fs.readFileSync(printPath, 'utf-8');

        // Combine both CSS files
        const cssContent = `${variablesCSS}\n\n${printCSS}`;
        console.log('✅ Print CSS loaded from frontend (with variables)');
        return cssContent;
    } catch (error) {
        console.warn('⚠️ Failed to load print CSS:', error.message);
        return '/* CSS load failed */';
    }
}

// Load and cache the shared print template (same as frontend)
let printTemplateContent = null;
function loadPrintTemplate() {
    if (printTemplateContent) return printTemplateContent;

    try {
        const templatePath = path.join(__dirname, '../../public/templates/print-page.html');
        const templateFile = fs.readFileSync(templatePath, 'utf-8');
        const dom = new JSDOM(templateFile);
        const templateEl = dom.window.document.querySelector('#printPageTemplate');
        if (!templateEl) {
            throw new Error('printPageTemplate not found');
        }
        printTemplateContent = templateEl.innerHTML.trim();
        console.log('✅ Print template loaded from frontend');
    } catch (error) {
        console.error('❌ Failed to load print template:', error.message);
        printTemplateContent = '';
    }
    return printTemplateContent;
}

/**
 * Generate PDF from order data
 * @param {Object} orderData - Order data including items list
 * @param {string} poNumber - Purchase order number
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePurchaseOrderPDF(orderData, poNumber) {
    let browser;

    try {
        console.log(`📄 Starting PDF generation for ${poNumber}...`);

        // Launch headless browser
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

        // Set viewport for consistent rendering
        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 2
        });

        // Generate HTML content
        const html = generatePrintHTML(orderData, poNumber);

        // Load HTML content
        await page.setContent(html, {
            waitUntil: ['domcontentloaded', 'networkidle0']
        });

        // Use print media rules (applies @media print + @page)
        await page.emulateMediaType('print');

        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready');

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            },
            preferCSSPageSize: true,
            displayHeaderFooter: false
        });

        console.log(`✅ PDF generated successfully for ${poNumber} (${pdfBuffer.length} bytes)`);

        // Debug: Save PDF to temp directory for verification
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempPath = path.join(tempDir, `${poNumber}_debug.pdf`);
        fs.writeFileSync(tempPath, pdfBuffer);
        console.log(`🔍 Debug PDF saved to: ${tempPath}`);

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

/**
 * Generate complete HTML for printing
 * @param {Object} orderData - Order data
 * @param {string} poNumber - PO number
 * @returns {string} Complete HTML string
 */
function generatePrintHTML(orderData, poNumber) {
    const today = new Date().toISOString().split('T')[0];

    // Load packaging configuration
    const config = loadPackagingConfig();

    // Group items by packaging
    const packageGroups = groupByPackaging(orderData.list, config);

    // Generate pages HTML
    const pagesHTML = renderPagesFromTemplate(orderData, packageGroups, today, poNumber, config);

    // Load CSS from frontend
    const css = loadPrintCSS();

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${poNumber}</title>
    <style>
        ${css}
    </style>
</head>
<body>
    ${pagesHTML}
</body>
</html>
`;
}

const MAX_ROWS_PER_PAGE = 22;

/**
 * Render pages using the shared print template (same as frontend)
 */
function renderPagesFromTemplate(orderData, packageGroups, date, poNumber, config) {
    const templateHTML = loadPrintTemplate();
    const supplierName = config.supplierName || '默认供应商';
    const pages = [];

    Object.entries(packageGroups).forEach(([pkgName, group]) => {
        const items = group.items;
        const externalName = group.externalName;
        const totalPages = Math.max(1, Math.ceil(items.length / MAX_ROWS_PER_PAGE));
        const groupTotals = items.reduce((acc, item) => {
            const qty = parseQuantityPair(item.qty);
            acc.left += qty.left;
            acc.right += qty.right;
            return acc;
        }, { left: 0, right: 0 });

        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
            const startIdx = pageNum * MAX_ROWS_PER_PAGE;
            const endIdx = Math.min(startIdx + MAX_ROWS_PER_PAGE, items.length);
            const pageItems = items.slice(startIdx, endIdx);

            const dom = new JSDOM(templateHTML);
            const doc = dom.window.document;
            const pageEl = doc.querySelector('.print-page');
            if (!pageEl) {
                throw new Error('print-page element not found in template');
            }

            // Header info
            doc.querySelector('.p-supplier').textContent = supplierName;
            doc.querySelector('.p-customer').textContent = orderData.customerName || '';
            doc.querySelector('.p-code').textContent = orderData.code || '';
            doc.querySelector('.p-int-pkg').textContent = pkgName;
            doc.querySelector('.p-ext-pkg').textContent = externalName;

            const today = date;
            doc.querySelector('.p-date').setAttribute('value', today);
            doc.querySelector('.p-delivery').setAttribute('value', today);

            // Page number if multiple pages
            if (totalPages > 1) {
                const h1 = doc.querySelector('.print-header h1');
                h1.innerHTML = `包装采购订单 <span style="font-size: 14px; font-weight: normal; color: #666;">(第${pageNum + 1}页/共${totalPages}页)</span>`;
            }

            // Table rows
            const tbody = doc.querySelector('.p-tbody');
            pageItems.forEach((item, index) => {
                const qty = parseQuantityPair(item.qty);
                // 留空备注，让用户手写
                const remark = '';

                const tr = doc.createElement('tr');
                tr.innerHTML = `
                    <td>${startIdx + index + 1}</td>
                    <td>${item.productModelName || '-'}</td>
                    <td>${item.spec}</td>
                    <td>${item.mb || '-'}</td>
                    <td>${qty.left}</td>
                    <td>${qty.right}</td>
                    <td>${remark}</td>
                `;
                tbody.appendChild(tr);
            });

            // Total row on last page for this group
            if (pageNum === totalPages - 1) {
                const totalRow = doc.createElement('tr');
                totalRow.className = 'total-row';
                totalRow.innerHTML = `
                    <td colspan="4" style="text-align: right;">合计</td>
                    <td>${groupTotals.left}</td>
                    <td>${groupTotals.right}</td>
                    <td></td>
                `;
                tbody.appendChild(totalRow);
            }

            pages.push(pageEl.outerHTML);
        }
    });

    return pages.join('');
}

/**
 * Group items by packaging type
 */
function groupByPackaging(items, config) {
    const groups = {};
    const mappings = config.mappings || {};

    items.forEach(item => {
        const internalName = item.bz || "无名称";
        const externalName = mappings[internalName] || "未匹配";

        if (!groups[internalName]) {
            groups[internalName] = {
                internalName,
                externalName,
                items: []
            };
        }
        groups[internalName].items.push(item);
    });

    return groups;
}

/**
 * Parse quantity pair (left/right)
 */
function parseQuantityPair(qtyString) {
    if (!qtyString) return { left: 0, right: 0 };

    const cleaned = String(qtyString).trim();
    const slashIndex = cleaned.indexOf('/');

    if (slashIndex === -1) {
        const val = parseInt(cleaned, 10) || 0;
        return { left: val, right: 0 };
    }

    const left = parseInt(cleaned.substring(0, slashIndex), 10) || 0;
    const right = parseInt(cleaned.substring(slashIndex + 1), 10) || 0;

    return { left, right };
}

module.exports = {
    generatePurchaseOrderPDF
};
