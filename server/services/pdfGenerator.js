/**
 * PDF Generator Service
 * Uses Puppeteer to generate high-quality PDFs from HTML
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const SHARED_PROCUREMENT_SCHEMA = require('../../src/features/procurement/procurement-schema.shared.json');

const CATEGORY_CONFIGS = SHARED_PROCUREMENT_SCHEMA.categories;
const SEMANTIC_BASE_WIDTHS = SHARED_PROCUREMENT_SCHEMA.semanticWidths;
const CATEGORY_BASELINE_TOTAL_WIDTH = SHARED_PROCUREMENT_SCHEMA.categoryBaselineTotalWidth;

function resolveLabelBySemantic(semantic, fallbackLabel) {
    if (semantic === 'specLike') return '规格';
    return fallbackLabel;
}

function getCategoryConfig(category) {
    const categorySchema = CATEGORY_CONFIGS[category];
    if (!categorySchema) return null;

    const fields = (categorySchema.columns || []).map((column) => column.key);
    const headers = (categorySchema.columns || []).map((column) =>
        resolveLabelBySemantic(column.semantic, column.label)
    );

    return {
        title: categorySchema.title,
        groupBy: categorySchema.groupBy,
        fields,
        headers,
        columns: categorySchema.columns || []
    };
}

function getDefaultColumnWidths(category) {
    const categorySchema = CATEGORY_CONFIGS[category];
    if (!categorySchema) return {};

    const defaults = {};
    (categorySchema.columns || []).forEach((column) => {
        defaults[column.key] = SEMANTIC_BASE_WIDTHS[column.semantic] || 120;
    });

    const baseline = Number(CATEGORY_BASELINE_TOTAL_WIDTH[category] || 0);
    const total = Object.values(defaults).reduce((sum, value) => sum + Number(value || 0), 0);
    const extra = baseline - total;
    if (Object.prototype.hasOwnProperty.call(defaults, 'remark')) {
        defaults.remark = Math.max(160, Number(defaults.remark || 160) + extra);
    }
    return defaults;
}

function getPrintFieldClass(field) {
    if (field === 'qtyLeft' || field === 'qtyRight' || field === 'quantity') {
        return 'col-numeric';
    }
    return '';
}

function getAlignClass(align) {
    if (align === 'left') return 'col-left';
    if (align === 'right') return 'col-right';
    return 'col-center';
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
function loadPrintCSS() {
    try {
        const resetPath = path.join(__dirname, '../../public/css/core/reset.css');
        const resetCSS = fs.readFileSync(resetPath, 'utf-8');

        const variablesPath = path.join(__dirname, '../../public/css/core/variables.css');
        const variablesCSS = fs.readFileSync(variablesPath, 'utf-8');

        const utilitiesPath = path.join(__dirname, '../../public/css/core/utilities.css');
        const utilitiesCSS = fs.readFileSync(utilitiesPath, 'utf-8');

        const printPath = path.join(__dirname, '../../public/css/pages/print.css');
        const printCSS = fs.readFileSync(printPath, 'utf-8');

        const cssContent = `${resetCSS}\n\n${variablesCSS}\n\n${utilitiesCSS}\n\n${printCSS}`;
        console.log('✅ Print CSS loaded from frontend (reset + variables + utilities + print)');
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

function normalizeCategory(categoryRaw) {
    const raw = String(categoryRaw || '').toLowerCase();
    if (raw === 'packaging' || raw.includes('包装')) return 'packaging';
    if (raw === 'cylinder' || raw.includes('锁芯')) return 'cylinder';
    if (raw === 'lock' || raw.includes('锁叉')) return 'lock';
    if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return 'hardware';
    return 'packaging';
}

function normalizePrintMode(modeRaw) {
    const raw = String(modeRaw || '').toLowerCase();
    return raw === 'compact' ? 'compact' : 'signature';
}

function normalizeDateString(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
}

function resolvePrintDates(orderData) {
    const today = new Date().toISOString().split('T')[0];
    const orderDate = normalizeDateString(orderData?.orderDate || orderData?.created_at) || today;
    const deliveryDate = normalizeDateString(orderData?.deliveryDate || orderData?.delivery_date) || orderDate;
    return { orderDate, deliveryDate };
}

function resolvePrintColumnWidths(orderData) {
    const result = {};
    const source = orderData?.printColumnWidths;
    if (!source || typeof source !== 'object') return result;

    Object.entries(source).forEach(([field, value]) => {
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && parsed >= 36) {
            result[field] = parsed;
        }
    });
    return result;
}

function parseQuantityPair(qtyString) {
    if (!qtyString) return { left: 0, right: 0 };

    const cleaned = String(qtyString).trim();
    const slashIndex = cleaned.indexOf('/');

    if (slashIndex === -1) {
        const val = Number.parseFloat(cleaned) || 0;
        return { left: val, right: val };
    }

    const left = Number.parseFloat(cleaned.substring(0, slashIndex)) || 0;
    const right = Number.parseFloat(cleaned.substring(slashIndex + 1)) || 0;

    return { left, right };
}

function resolveLeftRightQty(item) {
    if (item?.qty !== undefined && item?.qty !== null && item?.qty !== '') {
        return parseQuantityPair(item.qty);
    }

    const left = Number(item?.quantity_left || 0);
    const right = Number(item?.quantity_right || 0);
    if (left > 0 || right > 0) {
        return { left, right };
    }

    const quantity = Number(item?.quantity || 0);
    return { left: quantity, right: 0 };
}

function normalizeProductNames(rawName) {
    if (!rawName) return [];

    const raw = String(rawName).trim();
    if (!raw) return [];

    const byLine = raw
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean);

    const source = byLine.length > 1
        ? byLine
        : raw.includes(' / ')
            ? raw.split(/\s+\/\s+/).map((name) => name.trim()).filter(Boolean)
            : [raw];

    return Array.from(new Set(source));
}

function formatProductNameDisplay(rawName) {
    const names = normalizeProductNames(rawName);
    return names.length > 0 ? names.join('\n') : '-';
}

function normalizeItem(item, category, config) {
    if (category === 'packaging') {
        const qty = resolveLeftRightQty(item);
        const mappings = config?.mappings || {};
        const internalName =
            item?.internal_name ||
            item?.internalName ||
            item?.bz ||
            item?.name ||
            item?.model ||
            '无名称';
        const externalName = item?.external_name || item?.externalName || mappings[internalName] || item?.name || '未匹配';

        return {
            supplier: item?.supplier || config?.supplierName || '默认供应商',
            internal_name: internalName,
            external_name: externalName,
            name: formatProductNameDisplay(item?.name || item?.productModelName || '-'),
            spec: item?.spec || item?.model || '-',
            mb: item?.mb || item?.orientation || '-',
            qtyLeft: Number(qty.left || 0),
            qtyRight: Number(qty.right || 0),
            quantity: Number(item?.quantity || 0),
            unit: item?.unit || '套',
            remark: item?.remark || ''
        };
    }

    if (category === 'cylinder') {
        return {
            supplier: item?.supplier || '未分类',
            type: item?.type || item?.name || '-',
            eccentricity: item?.eccentricity || '-',
            quantity: Number(item?.quantity || 0),
            unit: item?.unit || '套',
            remark: item?.remark || ''
        };
    }

    if (category === 'lock') {
        return {
            supplier: item?.supplier || '未分类',
            type: item?.type || item?.name || '-',
            spec: item?.spec || item?.model || '-',
            quantity: Number(item?.quantity || 0),
            unit: item?.unit || '个',
            remark: item?.remark || ''
        };
    }

    return {
        supplier: item?.supplier || '未分类',
        type: item?.type || item?.name || '-',
        spec: item?.spec || item?.model || '-',
        quantity: Number(item?.quantity || 0),
        remark: item?.remark || ''
    };
}

function normalizeItems(items, category, config) {
    return (items || []).map((item) => normalizeItem(item, category, config));
}

function groupItemsByCategory(items, category) {
    const groups = {};
    const categoryConfig = getCategoryConfig(category);

    if (category === 'packaging') {
        items.forEach((item) => {
            const key = item.internal_name || '无名称';
            if (!groups[key]) {
                groups[key] = {
                    supplier: item.supplier || '默认供应商',
                    internalName: item.internal_name || '无名称',
                    externalName: item.external_name || '未匹配',
                    items: []
                };
            }
            groups[key].items.push(item);
        });
        return groups;
    }

    items.forEach((item) => {
        const key = item[categoryConfig.groupBy] || '未分类';
        if (!groups[key]) {
            groups[key] = {
                supplier: item.supplier || key,
                internalName: '-',
                externalName: '-',
                items: []
            };
        }
        groups[key].items.push(item);
    });

    return groups;
}

function getCellValue(item, field, rowNumber, category) {
    if (field === 'no') return rowNumber;
    if (field === 'productModelName') return item.name || '-';
    if (field === 'spec') return item.spec || item.model || '-';
    if (field === 'mb') return item.mb || '-';
    if (field === 'qtyLeft') return Number(item.qtyLeft || 0);
    if (field === 'qtyRight') return Number(item.qtyRight || 0);
    if (field === 'type') return item.type || item.name || '-';
    if (field === 'eccentricity') return item.eccentricity || '-';
    if (field === 'quantity') return Number(item.quantity || 0);
    if (field === 'unit') return item.unit || (category === 'cylinder' ? '套' : '个');
    if (field === 'remark') return category === 'packaging' ? '' : (item.remark || '');
    return '-';
}

function renderTotalRow(doc, category, categoryConfig, items) {
    const totalRow = doc.createElement('tr');
    totalRow.className = 'total-row';

    if (category === 'packaging') {
        const totalLeft = items.reduce((sum, item) => sum + Number(item.qtyLeft || 0), 0);
        const totalRight = items.reduce((sum, item) => sum + Number(item.qtyRight || 0), 0);
        totalRow.innerHTML = `<td colspan="4" style="text-align: right;">合计</td><td>${totalLeft}</td><td>${totalRight}</td><td></td>`;
        return totalRow;
    }

    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const quantityIndex = categoryConfig.fields.indexOf('quantity');
    const colspan = quantityIndex > 0 ? quantityIndex : categoryConfig.fields.length - 2;
    const trailingCount = categoryConfig.fields.length - quantityIndex - 1;
    const trailingCells = Array.from({ length: trailingCount }).map(() => '<td></td>').join('');
    totalRow.innerHTML = `<td colspan="${colspan}" style="text-align: right;">合计</td><td>${totalQuantity}</td>${trailingCells}`;
    return totalRow;
}

function setText(doc, selector, value) {
    const element = doc.querySelector(selector);
    if (element) {
        element.textContent = String(value ?? '');
    }
}

/**
 * Generate complete HTML for printing
 */
function generatePrintHTML(orderData, poNumber, category, printMode) {
    const config = loadPackagingConfig();
    const categoryConfig = getCategoryConfig(category);
    if (!categoryConfig) {
        throw new Error(`Unsupported category: ${category}`);
    }
    const normalizedItems = normalizeItems(orderData?.list || [], category, config);
    const grouped = groupItemsByCategory(normalizedItems, category);
    const pagesHTML = renderPagesFromTemplate(orderData, grouped, category, categoryConfig, printMode);
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

function renderPagesFromTemplate(orderData, groups, category, categoryConfig, printMode) {
    const templateHTML = loadPrintTemplate();
    const pages = [];
    const { orderDate, deliveryDate } = resolvePrintDates(orderData);
    const defaultWidths = getDefaultColumnWidths(category);
    const customWidths = resolvePrintColumnWidths(orderData);
    const resolvedWidths = { ...defaultWidths, ...customWidths };

    Object.keys(groups).forEach((groupKey) => {
        const group = groups[groupKey];
        const items = group.items || [];
        const dom = new JSDOM(templateHTML);
        const doc = dom.window.document;
        const pageEl = doc.querySelector('.print-page');
        if (!pageEl) throw new Error('print-page element not found in template');
        if (printMode === 'compact') {
            pageEl.classList.add('mode-compact');
        }

        const h1 = doc.querySelector('.print-header h1');
        if (h1) {
            h1.textContent = categoryConfig.title;
        }

        setText(doc, '.p-supplier', group.supplier || orderData?.supplier || '默认供应商');
        setText(doc, '.p-customer', orderData?.customerName || '');
        setText(doc, '.p-code', orderData?.code || '');
        setText(doc, '.p-int-pkg', category === 'packaging' ? (group.internalName || '-') : '-');
        setText(doc, '.p-ext-pkg', category === 'packaging' ? (group.externalName || '-') : '-');
        setText(doc, '.p-date', orderDate);
        setText(doc, '.p-delivery', deliveryDate);

        const tableEl = doc.querySelector('.print-table');
        if (tableEl) {
            tableEl.classList.add(`category-${category}`);
            const colgroup = doc.createElement('colgroup');
            categoryConfig.fields.forEach((field) => {
                const col = doc.createElement('col');
                const width = resolvedWidths[field];
                if (width) {
                    col.style.width = `${width}px`;
                }
                colgroup.appendChild(col);
            });
            tableEl.prepend(colgroup);
        }

        const theadRow = doc.querySelector('.print-table thead tr');
        if (theadRow) {
            theadRow.innerHTML = categoryConfig.headers
                .map((header, index) => {
                    const field = categoryConfig.fields[index];
                    const fieldClass = getPrintFieldClass(field);
                    const alignClass = getAlignClass(categoryConfig.columns?.[index]?.align);
                    return `<th class="${fieldClass} ${alignClass}">${header}</th>`;
                })
                .join('');
        }

        const tbody = doc.querySelector('.p-tbody');
        if (!tbody) {
            return;
        }

        items.forEach((item, index) => {
            const tr = doc.createElement('tr');
            categoryConfig.fields.forEach((field, fieldIndex) => {
                const td = doc.createElement('td');
                td.textContent = String(getCellValue(item, field, index + 1, category));
                const fieldClass = getPrintFieldClass(field);
                if (fieldClass) {
                    td.classList.add(fieldClass);
                }
                td.classList.add(getAlignClass(categoryConfig.columns?.[fieldIndex]?.align));
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        tbody.appendChild(renderTotalRow(doc, category, categoryConfig, items));

        pages.push(pageEl.outerHTML);
    });

    return pages.join('');
}

/**
 * Generate PDF from order data
 * @param {Object} orderData - Order data including items list
 * @param {string} poNumber - Purchase order number
 * @param {string} categoryRaw - Procurement category
 * @param {string} printModeRaw - Print style mode ('signature' | 'compact')
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePurchaseOrderPDF(orderData, poNumber, categoryRaw, printModeRaw) {
    let browser;
    const category = normalizeCategory(categoryRaw);
    const printMode = normalizePrintMode(printModeRaw);

    try {
        console.log(`📄 Starting PDF generation for ${poNumber} [${category}/${printMode}]...`);

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

        const html = generatePrintHTML(orderData, poNumber, category, printMode);

        await page.setContent(html, {
            waitUntil: ['domcontentloaded', 'networkidle0']
        });

        await page.emulateMediaType('print');
        await page.evaluateHandle('document.fonts.ready');

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

        console.log(`✅ PDF generated successfully for ${poNumber} (${pdfBuffer.length} bytes)`);

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

module.exports = {
    generatePurchaseOrderPDF
};
