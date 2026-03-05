import { configLoader } from '@/services/configLoader';

type PrintCategory = 'packaging' | 'cylinder' | 'hardware' | 'lock';

interface PrintOrder {
    customerName?: string;
    code?: string;
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

const CATEGORY_CONFIGS: Record<PrintCategory, { title: string; headers: string[]; fields: string[]; groupBy: string }> = {
    packaging: {
        title: '包装采购订单',
        headers: ['序号', '产品名称', '规格尺寸', '门边', '左数量', '右数量', '备注'],
        fields: ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark'],
        groupBy: 'bz'
    },
    cylinder: {
        title: '锁芯采购订单',
        headers: ['序号', '锁芯型号', '偏心', '数量', '备注'],
        fields: ['no', 'type', 'eccentricity', 'quantity', 'remark'],
        groupBy: 'supplier'
    },
    hardware: {
        title: '五金采购订单',
        headers: ['序号', '五金名称', '规格', '数量', '备注'],
        fields: ['no', 'type', 'spec', 'quantity', 'remark'],
        groupBy: 'type'
    },
    lock: {
        title: '锁叉采购订单',
        headers: ['序号', '产品名称', '规格', '数量', '单位', '备注'],
        fields: ['no', 'type', 'spec', 'quantity', 'unit', 'remark'],
        groupBy: 'supplier'
    }
};

let templateCache: HTMLTemplateElement | null = null;

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

export async function generatePrintPages(printOutput: HTMLElement, order: PrintOrder, category: PrintCategory) {
    await configLoader.loadAll();

    const template = await loadPrintTemplate();
    const config = CATEGORY_CONFIGS[category];
    const packagingMapping = configLoader.getPackagingMapping();
    const normalizedItems = normalizeItemsForCategory(order.list || [], category);
    const groups = groupItemsByCategory(normalizedItems, category, packagingMapping);

    printOutput.innerHTML = '';

    const MAX_ROWS_PER_PAGE = 22;

    Object.keys(groups).forEach((groupKey) => {
        const group = groups[groupKey];
        const items = group.items || [];
        const totalPages = Math.max(1, Math.ceil(items.length / MAX_ROWS_PER_PAGE));

        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
            const startIdx = pageNum * MAX_ROWS_PER_PAGE;
            const endIdx = Math.min(startIdx + MAX_ROWS_PER_PAGE, items.length);
            const pageItems = items.slice(startIdx, endIdx);

            const clone = document.importNode(template.content, true);
            const today = new Date().toISOString().split('T')[0];

            const h1 = clone.querySelector('.print-header h1') as HTMLElement | null;
            if (h1) {
                h1.textContent = config.title;
                if (totalPages > 1) {
                    h1.innerHTML = `${config.title} <span style="font-size: 14px; font-weight: normal; color: #666;">(第${pageNum + 1}页/共${totalPages}页)</span>`;
                }
            }

            const customerEl = clone.querySelector('.p-customer') as HTMLElement | null;
            const codeEl = clone.querySelector('.p-code') as HTMLElement | null;
            const dateEl = clone.querySelector('.p-date') as HTMLInputElement | null;
            const deliveryEl = clone.querySelector('.p-delivery') as HTMLInputElement | null;
            const supplierEl = clone.querySelector('.p-supplier') as HTMLElement | null;
            const intPkgEl = clone.querySelector('.p-int-pkg') as HTMLElement | null;
            const extPkgEl = clone.querySelector('.p-ext-pkg') as HTMLElement | null;

            if (customerEl) customerEl.textContent = order.customerName || '-';
            if (codeEl) codeEl.textContent = order.code || '-';
            if (dateEl) dateEl.value = today;
            if (deliveryEl) deliveryEl.value = today;

            if (category === 'packaging') {
                const pkgGroup = group as { internalName: string; externalName: string; items: NormalizedPrintItem[] };
                if (supplierEl) supplierEl.textContent = packagingMapping?.supplierName || '默认供应商';
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
                theadRow.innerHTML = config.headers.map((h) => `<th>${h}</th>`).join('');
            }

            const tbody = clone.querySelector('.p-tbody') as HTMLTableSectionElement | null;
            if (!tbody) continue;

            pageItems.forEach((item: NormalizedPrintItem, index: number) => {
                const tr = document.createElement('tr');
                config.fields.forEach((field) => {
                    const td = document.createElement('td');
                    let value: string | number = '-';

                    if (field === 'no') value = startIdx + index + 1;
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
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

            if (pageNum === totalPages - 1) {
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
            }

            printOutput.appendChild(clone);
        }
    });
}
