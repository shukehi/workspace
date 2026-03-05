import { configLoader } from '@/services/configLoader';
import printCategoryConfig from '@/config/print-category-config.json';

type PrintCategory = 'packaging' | 'cylinder' | 'hardware' | 'lock';
type PrintMode = 'signature' | 'compact';

interface PrintOrder {
    customerName?: string;
    code?: string;
    orderDate?: string;
    deliveryDate?: string;
    created_at?: string;
    delivery_date?: string;
    printColumnWidths?: Record<string, number>;
    list?: any[];
}

interface NormalizedPrintItem {
    supplier?: string;
    internal_name?: string;
    external_name?: string;
    name?: string;
    type?: string;
    spec?: string;
    model?: string;
    mb?: string;
    eccentricity?: string;
    qtyLeft?: number;
    qtyRight?: number;
    quantity?: number;
    unit?: string;
    remark?: string;
}

type CategoryConfig = { title: string; headers: string[]; fields: string[]; groupBy: string };
const CATEGORY_CONFIGS = printCategoryConfig as Record<PrintCategory, CategoryConfig>;

let templateCache: HTMLTemplateElement | null = null;

function getPrintFieldClass(field: string) {
    if (field === 'qtyLeft' || field === 'qtyRight' || field === 'quantity') {
        return 'col-numeric';
    }
    return '';
}

function normalizeDateString(value: unknown): string {
    if (!value) return '';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
}

function resolvePrintDates(order: PrintOrder) {
    const today = new Date().toISOString().split('T')[0];
    const orderDate = normalizeDateString(order.orderDate || order.created_at) || today;
    const deliveryDate = normalizeDateString(order.deliveryDate || order.delivery_date) || orderDate;
    return { orderDate, deliveryDate };
}

function resolvePrintColumnWidths(order: PrintOrder) {
    const result: Record<string, number> = {};
    const source = order?.printColumnWidths;
    if (!source || typeof source !== 'object') return result;

    Object.entries(source).forEach(([field, value]) => {
        const parsed = Number(value);
        if (!Number.isNaN(parsed) && parsed >= 36) {
            result[field] = parsed;
        }
    });
    return result;
}

function parseQuantityPair(qtyStr: any) {
    if (!qtyStr) return { left: 0, right: 0 };
    const parts = qtyStr.toString().split('/');
    const leftVal = Number.parseFloat(parts[0]) || 0;
    const rightVal = Number.parseFloat(parts[1]) || leftVal;
    return { left: leftVal, right: rightVal };
}

function resolvePackagingInternalName(item: any) {
    return (
        item?.internalName ||
        item?.internal_name ||
        item?.bz ||
        item?.name ||
        item?.model ||
        '无名称'
    );
}

function resolveLeftRightQty(item: any) {
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

function normalizeProductNames(rawName: string | undefined) {
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

function formatProductNameDisplay(rawName: string | undefined) {
    const names = normalizeProductNames(rawName);
    return names.length > 0 ? names.join('\n') : '-';
}

function normalizeItemForCategory(item: any, category: PrintCategory): NormalizedPrintItem {
    if (category === 'packaging') {
        const qty = resolveLeftRightQty(item);
        return {
            supplier: item?.supplier,
            internal_name: resolvePackagingInternalName(item),
            external_name: item?.external_name || item?.name,
            name: formatProductNameDisplay(item?.name || item?.productModelName),
            spec: item?.spec || item?.model || '-',
            mb: item?.mb || item?.orientation || '-',
            qtyLeft: qty.left,
            qtyRight: qty.right,
            quantity: Number(item?.quantity || 0),
            unit: item?.unit || '套',
            remark: item?.remark || ''
        };
    }

    if (category === 'cylinder') {
        return {
            supplier: item?.supplier,
            type: item?.type || item?.name || '-',
            eccentricity: item?.eccentricity || '-',
            quantity: Number(item?.quantity || 0),
            remark: item?.remark || ''
        };
    }

    if (category === 'lock') {
        return {
            supplier: item?.supplier,
            type: item?.type || item?.name || '-',
            spec: item?.spec || item?.model || '-',
            quantity: Number(item?.quantity || 0),
            unit: item?.unit || '个',
            remark: item?.remark || ''
        };
    }

    return {
        supplier: item?.supplier,
        type: item?.type || item?.name || '-',
        spec: item?.spec || item?.model || '-',
        quantity: Number(item?.quantity || 0),
        remark: item?.remark || ''
    };
}

function normalizeItemsForCategory(items: any[], category: PrintCategory): NormalizedPrintItem[] {
    return (items || []).map((item) => normalizeItemForCategory(item, category));
}

export function normalizePrintCategory(category: string | undefined): PrintCategory {
    const raw = (category || '').toLowerCase();
    if (raw === 'packaging' || raw.includes('包装')) return 'packaging';
    if (raw === 'cylinder' || raw.includes('锁芯')) return 'cylinder';
    if (raw === 'lock' || raw.includes('锁叉')) return 'lock';
    if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return 'hardware';
    return 'packaging';
}

export function normalizePrintMode(mode: string | undefined): PrintMode {
    const raw = (mode || '').toLowerCase();
    return raw === 'compact' ? 'compact' : 'signature';
}

async function loadPrintTemplate() {
    if (templateCache) return templateCache;

    const response = await fetch('/templates/print-page.html');
    const html = await response.text();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const template = tempDiv.querySelector('template');
    if (!template) throw new Error('Print template not found');

    templateCache = template as HTMLTemplateElement;
    return templateCache;
}

function groupItemsByPackaging(items: NormalizedPrintItem[], packagingMapping: any) {
    const groups: Record<string, { internalName: string; externalName: string; items: NormalizedPrintItem[] }> = {};
    const mappings = packagingMapping?.mappings || packagingMapping || {};

    (items || []).forEach((item) => {
        const internalName = item.internal_name || '无名称';
        const externalName = item.external_name || mappings[internalName] || item.name || '未匹配';

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

function groupItemsByCategory(items: NormalizedPrintItem[], category: PrintCategory, packagingMapping: any) {
    if (category === 'packaging') {
        return groupItemsByPackaging(items, packagingMapping);
    }

    const config = CATEGORY_CONFIGS[category];
    const groups: Record<string, { supplier: string; items: NormalizedPrintItem[] }> = {};

    (items || []).forEach((item) => {
        const key = (item as any)[config.groupBy] || '未分类';
        if (!groups[key]) {
            groups[key] = {
                supplier: item.supplier || key,
                items: []
            };
        }
        groups[key].items.push(item);
    });

    return groups;
}

export async function generatePrintPages(
    printOutput: HTMLElement,
    order: PrintOrder,
    category: PrintCategory,
    mode: PrintMode = 'signature'
) {
    await configLoader.loadAll();

    const template = await loadPrintTemplate();
    const config = CATEGORY_CONFIGS[category];
    const packagingMapping = configLoader.getPackagingMapping();
    const normalizedItems = normalizeItemsForCategory(order.list || [], category);
    const groups = groupItemsByCategory(normalizedItems, category, packagingMapping);
    const { orderDate, deliveryDate } = resolvePrintDates(order);
    const customWidths = resolvePrintColumnWidths(order);

    printOutput.innerHTML = '';

    Object.keys(groups).forEach((groupKey) => {
        const group = groups[groupKey];
        const items = group.items || [];
        const clone = document.importNode(template.content, true);
        const pageEl = clone.querySelector('.print-page') as HTMLElement | null;
        const tableEl = clone.querySelector('.print-table') as HTMLTableElement | null;

        if (pageEl) {
            if (mode === 'compact') {
                pageEl.classList.add('mode-compact');
            } else {
                pageEl.classList.remove('mode-compact');
            }
        }

        if (tableEl) {
            tableEl.classList.add(`category-${category}`);
            const colgroup = document.createElement('colgroup');
            config.fields.forEach((field) => {
                const col = document.createElement('col');
                const width = customWidths[field];
                if (width) {
                    col.style.width = `${width}px`;
                }
                colgroup.appendChild(col);
            });
            tableEl.prepend(colgroup);
        }

        const h1 = clone.querySelector('.print-header h1') as HTMLElement | null;
        if (h1) {
            h1.textContent = config.title;
        }

        const customerEl = clone.querySelector('.p-customer') as HTMLElement | null;
        const codeEl = clone.querySelector('.p-code') as HTMLElement | null;
        const dateEl = clone.querySelector('.p-date') as HTMLElement | null;
        const deliveryEl = clone.querySelector('.p-delivery') as HTMLElement | null;
        const supplierEl = clone.querySelector('.p-supplier') as HTMLElement | null;
        const intPkgEl = clone.querySelector('.p-int-pkg') as HTMLElement | null;
        const extPkgEl = clone.querySelector('.p-ext-pkg') as HTMLElement | null;

        if (customerEl) customerEl.textContent = order.customerName || '-';
        if (codeEl) codeEl.textContent = order.code || '-';
        if (dateEl) dateEl.textContent = orderDate;
        if (deliveryEl) deliveryEl.textContent = deliveryDate;

        if (category === 'packaging') {
            const pkgGroup = group as { internalName: string; externalName: string; items: NormalizedPrintItem[] };
            const supplier = pkgGroup.items?.[0]?.supplier || packagingMapping?.supplierName || '默认供应商';
            if (supplierEl) supplierEl.textContent = supplier;
            if (intPkgEl) intPkgEl.textContent = pkgGroup.internalName || groupKey;
            if (extPkgEl) extPkgEl.textContent = pkgGroup.externalName || groupKey;
        } else {
            const normalGroup = group as { supplier: string; items: NormalizedPrintItem[] };
            if (supplierEl) supplierEl.textContent = normalGroup.supplier || groupKey;
            if (intPkgEl) intPkgEl.textContent = '-';
            if (extPkgEl) extPkgEl.textContent = '-';
        }

        const theadRow = clone.querySelector('.print-table thead tr') as HTMLTableRowElement | null;
        if (theadRow) {
            theadRow.innerHTML = config.headers
                .map((header, index) => {
                    const field = config.fields[index];
                    const fieldClass = getPrintFieldClass(field);
                    return `<th class="${fieldClass}">${header}</th>`;
                })
                .join('');
        }

        const tbody = clone.querySelector('.p-tbody') as HTMLTableSectionElement | null;
        if (!tbody) return;

        items.forEach((item: NormalizedPrintItem, index: number) => {
            const tr = document.createElement('tr');
            config.fields.forEach((field) => {
                const td = document.createElement('td');
                let value: string | number = '-';

                if (field === 'no') value = index + 1;
                else if (field === 'productModelName') value = item.name || '-';
                else if (field === 'spec') value = item.spec || item.model || '-';
                else if (field === 'mb') value = item.mb || '-';
                else if (field === 'qtyLeft') value = Number(item.qtyLeft || 0);
                else if (field === 'qtyRight') value = Number(item.qtyRight || 0);
                else if (field === 'type') value = item.type || item.name || '-';
                else if (field === 'eccentricity') value = item.eccentricity || '-';
                else if (field === 'quantity') value = Number(item.quantity || 0);
                else if (field === 'unit') value = item.unit || '个';
                else if (field === 'remark') value = category === 'packaging' ? '' : (item.remark || '');

                td.textContent = String(value);
                const fieldClass = getPrintFieldClass(field);
                if (fieldClass) {
                    td.classList.add(fieldClass);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        const totalRow = document.createElement('tr');
        totalRow.className = 'total-row';

        if (category === 'packaging') {
            let groupTotalLeft = 0;
            let groupTotalRight = 0;
            items.forEach((item: NormalizedPrintItem) => {
                groupTotalLeft += Number(item.qtyLeft || 0);
                groupTotalRight += Number(item.qtyRight || 0);
            });

            totalRow.innerHTML = `<td colspan="4" style="text-align: right;">合计</td><td>${groupTotalLeft}</td><td>${groupTotalRight}</td><td></td>`;
        } else {
            let groupTotal = 0;
            items.forEach((item: NormalizedPrintItem) => {
                groupTotal += Number(item.quantity || 0);
            });
            const colspanCount = config.fields.length - (category === 'lock' ? 3 : 2);
            totalRow.innerHTML = `<td colspan="${colspanCount}" style="text-align: right;">合计</td><td>${groupTotal}</td>${category === 'lock' ? '<td></td>' : ''}<td></td>`;
        }

        tbody.appendChild(totalRow);
        printOutput.appendChild(clone);
    });
}
