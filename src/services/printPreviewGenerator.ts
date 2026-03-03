import { configLoader } from '@/services/configLoader';

type PrintCategory = 'packaging' | 'cylinder' | 'hardware' | 'lock';

interface PrintOrder {
    customerName?: string;
    code?: string;
    list?: any[];
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
        headers: ['序号', '边锁型号', '规格', '数量', '单位', '备注'],
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

function groupItemsByPackaging(items: any[], packagingMapping: any) {
    const groups: Record<string, any> = {};
    const mappings = packagingMapping?.mappings || packagingMapping || {};

    (items || []).forEach((item) => {
        const internalName = item.bz || '无名称';
        const externalName = mappings[internalName] || '未匹配';

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

function groupItemsByCategory(items: any[], category: PrintCategory, packagingMapping: any) {
    if (category === 'packaging') {
        return groupItemsByPackaging(items, packagingMapping);
    }

    const config = CATEGORY_CONFIGS[category];
    const groups: Record<string, any> = {};

    (items || []).forEach((item) => {
        const key = item[config.groupBy] || '未分类';
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
    const groups = groupItemsByCategory(order.list || [], category, packagingMapping);

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
                if (supplierEl) supplierEl.textContent = packagingMapping?.supplierName || '默认供应商';
                if (intPkgEl) intPkgEl.textContent = group.internalName || groupKey;
                if (extPkgEl) extPkgEl.textContent = group.externalName || groupKey;
            } else {
                if (supplierEl) supplierEl.textContent = group.supplier || groupKey;
                if (intPkgEl) intPkgEl.textContent = '-';
                if (extPkgEl) extPkgEl.textContent = '-';
            }

            const theadRow = clone.querySelector('.print-table thead tr') as HTMLTableRowElement | null;
            if (theadRow) {
                theadRow.innerHTML = config.headers.map((h) => `<th>${h}</th>`).join('');
            }

            const tbody = clone.querySelector('.p-tbody') as HTMLTableSectionElement | null;
            if (!tbody) continue;

            pageItems.forEach((item: any, index: number) => {
                const tr = document.createElement('tr');
                config.fields.forEach((field) => {
                    const td = document.createElement('td');
                    let value: string | number = '-';

                    if (field === 'no') value = startIdx + index + 1;
                    else if (field === 'productModelName') value = item.productModelName || item.name || '-';
                    else if (field === 'spec') value = item.spec || item.model || '-';
                    else if (field === 'mb') value = item.mb || item.orientation || '-';
                    else if (field === 'qtyLeft') value = parseQuantityPair(item.qty).left;
                    else if (field === 'qtyRight') value = parseQuantityPair(item.qty).right;
                    else if (field === 'type') value = item.type || item.name || '-';
                    else if (field === 'eccentricity') value = item.eccentricity || '-';
                    else if (field === 'quantity') value = item.quantity || 0;
                    else if (field === 'unit') value = item.unit || '根';
                    else if (field === 'remark') value = item.remark || '';

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
                    items.forEach((item: any) => {
                        const qty = parseQuantityPair(item.qty);
                        groupTotalLeft += qty.left;
                        groupTotalRight += qty.right;
                    });

                    totalRow.innerHTML = `<td colspan="4" style="text-align: right;">合计</td><td>${groupTotalLeft}</td><td>${groupTotalRight}</td><td></td>`;
                } else {
                    let groupTotal = 0;
                    items.forEach((item: any) => {
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
