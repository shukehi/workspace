/**
 * PDF Generator Service
 * Uses Puppeteer to generate high-quality PDFs from HTML
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
    const pagesHTML = Object.entries(packageGroups).map(([pkgName, group]) => {
        return generatePageHTML(orderData, group, pkgName, today, poNumber, config);
    }).join('');

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

/**
 * Generate HTML for a single print page
 */
function generatePageHTML(orderData, group, pkgName, date, poNumber, config) {
    const items = group.items;
    const externalName = group.externalName;
    const supplierName = config.supplierName || '默认供应商';

    // Calculate totals
    let totalLeft = 0;
    let totalRight = 0;
    items.forEach(item => {
        const qty = parseQuantityPair(item.qty);
        totalLeft += qty.left;
        totalRight += qty.right;
    });

    // Generate table rows
    const rowsHTML = items.map((item, idx) => {
        const qty = parseQuantityPair(item.qty);
        // Prefer explicit remark, then order-level remark, then long instructions truncated
        const remarkSource = item.remark || orderData.remark || item.xsbz || item.fshz || '';
        const remark = String(remarkSource || '').slice(0, 80);
        return `
            <tr>
                <td>${idx + 1}</td>
                <td>${item.productModelName || '-'}</td>
                <td>${item.spec}</td>
                <td>${item.mb || '-'}</td>
                <td>${qty.left}</td>
                <td>${qty.right}</td>
                <td>${remark}</td>
            </tr>
        `;
    }).join('');

    return `
    <div class="print-page">
        <div class="print-header">
            <h1>包装采购订单</h1>
            <div class="print-info-container">
                <div class="print-info-top-columns">
                    <div class="print-col">
                        <div class="info-item">
                            <label>客户名称:</label> <span>${orderData.customerName}</span>
                        </div>
                        <div class="info-item">
                            <label>订单号:</label> <span>${orderData.code}</span>
                        </div>
                    </div>
                    <div class="print-col">
                        <div class="info-item">
                            <label>内部名称:</label> <span>${pkgName}</span>
                        </div>
                        <div class="info-item">
                            <label>外协名称:</label> <span>${externalName}</span>
                        </div>
                    </div>
                    <div class="print-col">
                        <div class="info-item">
                            <label>制单日期:</label> <span>${date}</span>
                        </div>
                        <div class="info-item">
                            <label>交货日期:</label> <span>${date}</span>
                        </div>
                    </div>
                </div>
                <div class="print-info-bottom-row">
                    <div class="info-item">
                        <label>供应商:</label> <span>${supplierName}</span>
                    </div>
                </div>
            </div>
        </div>

        <table class="print-table">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>产品名称</th>
                    <th>规格尺寸</th>
                    <th>门边</th>
                    <th>左数量</th>
                    <th>右数量</th>
                    <th>备注</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHTML}
                <tr class="total-row">
                    <td colspan="4" style="text-align: right;">合计</td>
                    <td>${totalLeft}</td>
                    <td>${totalRight}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <div class="print-footer">
            <div class="sign-box">
                <span>制单人:</span>
                <div class="line"></div>
            </div>
            <div class="sign-box">
                <span>审核人:</span>
                <div class="line"></div>
            </div>
            <div class="sign-box">
                <span>供应商签字:</span>
                <div class="line"></div>
            </div>
        </div>
    </div>
    `;
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
