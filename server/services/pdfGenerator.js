/**
 * PDF Generator Service
 * Uses Puppeteer to generate high-quality PDFs from HTML
 */

const puppeteer = require('puppeteer');

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

        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready');

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            },
            preferCSSPageSize: false,
            displayHeaderFooter: false
        });

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

/**
 * Generate complete HTML for printing
 * @param {Object} orderData - Order data
 * @param {string} poNumber - PO number
 * @returns {string} Complete HTML string
 */
function generatePrintHTML(orderData, poNumber) {
    const today = new Date().toISOString().split('T')[0];

    // Group items by packaging
    const packageGroups = groupByPackaging(orderData.list);

    // Generate pages HTML
    const pagesHTML = Object.entries(packageGroups).map(([pkgName, group]) => {
        return generatePageHTML(orderData, group, pkgName, today, poNumber);
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${poNumber}</title>
    <style>
        ${getPrintCSS()}
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
function generatePageHTML(orderData, group, pkgName, date, poNumber) {
    const items = group.items;
    const externalName = group.externalName;

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
        return `
            <tr>
                <td>${idx + 1}</td>
                <td>${item.productModelName || '-'}</td>
                <td>${item.spec}</td>
                <td>${item.mb || '-'}</td>
                <td>${qty.left}</td>
                <td>${qty.right}</td>
                <td></td>
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
                        <label>供应商:</label> <span>默认供应商</span>
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
function groupByPackaging(items) {
    const groups = {};
    const PACKAGING_MAPPING = {
        "罗曼蒂克": "美+C单",
        "3层黄卡美+C单瓦纸箱": "美+C单"
    };

    items.forEach(item => {
        const internalName = item.bz || "无名称";
        const externalName = PACKAGING_MAPPING[internalName] || "未匹配";

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

/**
 * Get print CSS styles
 */
function getPrintCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: white;
        }

        .print-page {
            background: white;
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            page-break-after: always;
        }

        .print-page:last-child {
            page-break-after: auto;
        }

        .print-header {
            text-align: center;
            border: 2px solid #000;
            margin-bottom: 20px;
            padding: 20px;
        }

        .print-header h1 {
            font-size: 28px;
            margin: 0 0 15px 0;
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .print-info-top-columns {
            display: flex;
            justify-content: space-between;
            gap: 30px;
            margin-top: 20px;
            text-align: left;
            font-size: 12px;
        }

        .print-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .print-info-bottom-row {
            margin-top: 8px;
            text-align: left;
            font-size: 13px;
            padding-top: 8px;
        }

        .info-item {
            display: flex;
            gap: 8px;
            align-items: baseline;
        }

        .info-item label {
            font-weight: 700;
            white-space: nowrap;
            min-width: 80px;
            text-transform: uppercase;
        }

        .info-item span {
            flex: 1;
            font-weight: 500;
        }

        .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            border: 2px solid #000;
        }

        .print-table th,
        .print-table td {
            border: 1px solid #000;
            padding: 8px 4px;
            text-align: center;
        }

        .print-table th {
            background-color: #e8e8e8;
            font-weight: 600;
        }

        .total-row {
            font-weight: bold;
            background-color: #f5f5f5;
        }

        .print-footer {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #000;
        }

        .sign-box {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }

        .line {
            border-bottom: 1.5px solid #000;
            width: 90px;
            height: 1px;
        }

        @media print {
            @page {
                size: A4 portrait;
                margin: 0;
            }
        }
    `;
}

module.exports = {
    generatePurchaseOrderPDF
};
