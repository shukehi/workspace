// Global variable for packaging mapping (will be loaded from config file)
let PACKAGING_MAPPING = {};

/**
 * Load packaging mapping configuration from JSON file
 * If loading fails, use default mapping as fallback
 */
async function loadPackagingMapping() {
    try {
        const response = await fetch('/packaging-mapping.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        PACKAGING_MAPPING = await response.json();
        console.log('✅ 包装映射配置加载成功:', Object.keys(PACKAGING_MAPPING).length, '个映射');

    } catch (error) {
        console.warn('⚠️ 加载包装映射配置失败，使用默认配置:', error.message);

        // Fallback to default mapping
        PACKAGING_MAPPING = {
            supplierName: "默认供应商",
            mappings: {
                "罗曼蒂克": "美+C单",
                "3层黄卡美+C单瓦纸箱": "美+C单"
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Load packaging mapping configuration first
    await loadPackagingMapping();

    const searchBtn = document.getElementById('searchBtn');
    const orderCodeInput = document.getElementById('orderCodeInput');
    const resultContainer = document.getElementById('resultContainer');
    const errorMsg = document.getElementById('errorMsg');
    const detailsTableBody = document.getElementById('detailsTableBody');

    // Bind event listeners
    searchBtn.addEventListener('click', handleSearch);
    orderCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    async function handleSearch() {
        const code = orderCodeInput.value.trim();

        // Reset state
        errorMsg.textContent = '';
        resultContainer.classList.add('hidden');

        if (!code) {
            errorMsg.textContent = '请输入订单号';
            return;
        }

        setLoading(true);

        try {
            // Fetch via local proxy to avoid CORS
            const response = await fetch(`/api/getOutContractDetail?code=${code}`);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.total === 0 || !data.rows || data.rows.length === 0) {
                errorMsg.textContent = '未找到该订单号的相关信息';
                window.currentOrderData = null;
            } else {
                window.currentOrderData = data.rows[0];
                renderOrder(data.rows[0]);
            }

        } catch (error) {
            console.error('Fetch error:', error);
            errorMsg.textContent = '查询失败，请检查网络或稍后重试 (可能是由于跨域限制，请尝试禁用浏览器安全策略或使用代理)';
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            searchBtn.classList.add('loading');
            searchBtn.disabled = true;
        } else {
            searchBtn.classList.remove('loading');
            searchBtn.disabled = false;
        }
    }

    function renderOrder(order) {
        // Summary fields
        setText('customerName', order.customerName);
        setText('orderCode', order.code);
        setText('orderDate', order.orderDate);
        setText('advanceDate', order.advanceDate);
        setText('orderRemark', order.remark || '无');

        // Table rows
        detailsTableBody.innerHTML = '';

        let allItems = [];

        if (order.list && order.list.length > 0) {
            allItems = order.list; // Store for aggregation
            order.list.forEach((item, index) => {
                const row = document.createElement('tr');

                // Parse details for better display tags
                const detailTags = [];
                if (item.mz) detailTags.push(item.mz); // Door material?
                if (item.tc) detailTags.push(`填充: ${item.tc}`);
                if (item.xd) detailTags.push(item.xd);

                const detailsHtml = detailTags.map(tag => `<span class="detail-tag">${tag}</span>`).join('');

                // Parse quantity into left and right
                const qtyPair = parseQuantityPair(item.qty);

                row.innerHTML = `
                    <td>${item.No}</td>
                    <td>
                        <div style="font-weight:500">${item.productModelName || '-'}</div>
                        <span class="spec-detail">${item.bz || ''}</span>
                    </td>
                    <td>${item.spec}</td>
                    <td>${item.color}</td>
                    <td style="font-weight:600">${qtyPair.left}</td>
                    <td style="font-weight:600">${qtyPair.right}</td>
                    <td>${item.mb}</td>
                    <td>${item.sx || '-'}</td>
                    <td>
                        <div style="max-width: 250px;">
                            ${detailsHtml}
                            <div class="spec-detail" style="margin-top:4px;">${item.xsbz || ''}</div>
                        </div>
                    </td>
                    <td style="text-align: center; vertical-align: middle;">
                        <label style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                            <input type="checkbox" class="merge-checkbox" data-index="${index}" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size:10px; color:#666; margin-top: 4px;">标准</span>
                        </label>
                    </td>
                `;
                detailsTableBody.appendChild(row);
            });
        } else {
            detailsTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">暂无明细数据</td></tr>';
        }

        // Render Packaging Summary
        renderPackagingSummary(allItems);

        resultContainer.classList.remove('hidden');
    }

    function renderPackagingSummary(items) {
        const packagingTableBody = document.getElementById('packagingTableBody');
        packagingTableBody.innerHTML = '';

        const aggregatedData = aggregatePackaging(items);

        if (Object.keys(aggregatedData).length === 0) {
            packagingTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">无包装数据</td></tr>';
            return;
        }

        for (const key in aggregatedData) {
            const data = aggregatedData[key];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight:600; color:var(--primary-color)">${data.supplierName}</td>
                <td>${data.spec}</td>
                <td style="font-weight:700; font-size: 1.1em">${data.totalQty}</td>
            `;
            packagingTableBody.appendChild(row);
        }
    }

    function aggregatePackaging(items) {
        const groups = {};

        items.forEach(item => {
            const internalName = item.bz || "未知";
            // Map to supplier name, default to internal name along with a marker if not found
            const mappings = PACKAGING_MAPPING.mappings || PACKAGING_MAPPING;
            const supplierName = mappings[internalName] || internalName + " (未匹配)";
            const spec = item.spec || "未知规格";
            const qty = parseQuantity(item.qty);

            // Create a unique key for grouping: Name + Spec
            const groupKey = `${supplierName}|${spec}`;

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    supplierName: supplierName,
                    spec: spec,
                    totalQty: 0
                };
            }

            groups[groupKey].totalQty += qty;
        });

        return groups;
    }

    // Helper: Parse quantity string like "75/75" or "3/3" or "10"
    // Returns total sum (for backward compatibility in packaging summary)
    function parseQuantity(qtyStr) {
        if (!qtyStr) return 0;
        const parts = qtyStr.toString().split('/');
        let sum = 0;
        parts.forEach(part => {
            const num = parseFloat(part);
            if (!isNaN(num)) {
                sum += num;
            }
        });
        return sum;
    }

    // NEW: Parse quantity string into left and right values
    // "3/3" → {left: 3, right: 3}
    // "10/15" → {left: 10, right: 15}
    // "5" → {left: 5, right: 5}
    function parseQuantityPair(qtyStr) {
        if (!qtyStr) return { left: 0, right: 0 };

        const parts = qtyStr.toString().split('/');
        const leftVal = parseFloat(parts[0]) || 0;
        const rightVal = parseFloat(parts[1]) || leftVal; // If no right value, use left value

        return {
            left: leftVal,
            right: rightVal
        };
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || '-';
    }

    // NEW: Normalize "2024年08月12日" to "2024-08-12"
    function formatDateToISO(dateStr) {
        if (!dateStr) return null;
        const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (match) {
            const y = match[1];
            const m = match[2].padStart(2, '0');
            const d = match[3].padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return dateStr; // Return original if already standard or unmatched
    }

    // Print Logic
    const previewBtn = document.getElementById('previewBtn');
    const printOutput = document.getElementById('printOutput');
    const printPageTemplate = document.getElementById('printPageTemplate');

    previewBtn.addEventListener('click', () => {
        if (!window.currentOrderData) {
            alert('请先查询订单');
            return;
        }

        // 1. Capture Merge Selections
        const checkboxes = document.querySelectorAll('.merge-checkbox');
        const mergeFlags = Array.from(checkboxes).map(cb => cb.checked);

        // 2. Prepare Data for Print
        // Deep copy to avoid mutating original
        const printData = JSON.parse(JSON.stringify(window.currentOrderData));

        // Tag items with merge flag
        if (printData.list) {
            printData.list.forEach((item, idx) => {
                item._allowMerge = mergeFlags[idx] || false;
            });
        }

        // 3. Process Merge Logic
        // We first simulate to see if any merging is possible
        const { reducedList, canMerge } = tryMergeItems(printData.list);

        if (canMerge) {
            // Ask user for confirmation
            if (confirm('检测到已勾选“标准”的项可以合并。\n\n【确定】合并相同规格\n【取消】保持独立显示')) {
                printData.list = reducedList;
            }
            // If cancel, we use original printData.list (unmerged)
        }

        generatePrintPages(printData);
        document.body.classList.add('print-mode');

        // Show zoom controls
        const zoomControls = document.getElementById('zoomControls');
        if (zoomControls) {
            zoomControls.classList.remove('hidden');
        }
    });

    /**
     * Try to merge items based on _allowMerge flag and properties
     * Returns the potentially merged list and a boolean indicating if any merge happened
     */
    function tryMergeItems(items) {
        if (!items || items.length === 0) return { reducedList: [], canMerge: false };

        // Group by Packaging Type first (bz) - consistent with generatePrintPages
        const groups = {};
        items.forEach(item => {
            const pkgName = item.bz || "DEFAULT";
            if (!groups[pkgName]) groups[pkgName] = [];
            groups[pkgName].push(item);
        });

        let finalList = [];
        let mergeCount = 0;

        // Process each packaging group
        for (const pkgName in groups) {
            const groupItems = groups[pkgName];

            const independentItems = [];
            const mergeableBuckets = {}; // Key -> Array of items

            groupItems.forEach(item => {
                if (!item._allowMerge) {
                    independentItems.push(item);
                } else {
                    // Create a unique key for merging: Spec + MB (Wall) + SX (Direction)
                    // Note: We ignore Color, Product Name for the key as per "same dimensions" requirement
                    // But we must keep them safe for display.
                    const key = `${item.spec}|${item.mb}|${item.sx}`;

                    if (!mergeableBuckets[key]) {
                        mergeableBuckets[key] = [];
                    }
                    mergeableBuckets[key].push(item);
                }
            });

            // Add independent items to final list
            finalList = finalList.concat(independentItems);

            // Process buckets
            for (const key in mergeableBuckets) {
                const bucket = mergeableBuckets[key];
                if (bucket.length === 1) {
                    // Only one item, no merge needed
                    finalList.push(bucket[0]);
                } else {
                    // Merge these items!
                    mergeCount++; // We found a group that reduces N items to 1

                    // Base item is the first one
                    const mergedItem = JSON.parse(JSON.stringify(bucket[0]));

                    let totalLeft = 0;
                    let totalRight = 0;
                    const productNames = new Set();
                    const remarks = new Set();

                    bucket.forEach(subItem => {
                        const q = parseQuantityPair(subItem.qty);
                        totalLeft += q.left;
                        totalRight += q.right;

                        if (subItem.productModelName) productNames.add(subItem.productModelName);
                        if (subItem.xsbz) remarks.add(subItem.xsbz);
                    });

                    // Update merged item properties
                    mergedItem.qty = `${totalLeft}/${totalRight}`; // Reconstruct qty string
                    mergedItem.productModelName = Array.from(productNames).join('/'); // Join names

                    // Mark as merged for potential UI highlighting (optional)
                    mergedItem._isMerged = true;

                    finalList.push(mergedItem);
                }
            }
        }

        // We need to restore the sorting order? 
        // Logic above might shuffle items (Independent first, then Merged).
        // If order matters, we'd need a more complex sort.
        // For packaging orders, grouping by type is paramount, intra-goup order is less critical.
        // But let's sort by No to be nice, if possible, or leave as is.
        // The current implementation appends independent then merged... 

        return {
            reducedList: finalList,
            canMerge: mergeCount > 0
        };
    }



    // Zoom Controls
    const zoom50Btn = document.getElementById('zoom50');
    const zoom75Btn = document.getElementById('zoom75');
    const zoom100Btn = document.getElementById('zoom100');
    const zoom125Btn = document.getElementById('zoom125');

    if (zoom50Btn) {
        zoom50Btn.addEventListener('click', () => setZoom('zoom-50'));
    }
    if (zoom75Btn) {
        zoom75Btn.addEventListener('click', () => setZoom('zoom-75'));
    }
    if (zoom100Btn) {
        zoom100Btn.addEventListener('click', () => setZoom('zoom-100'));
    }
    if (zoom125Btn) {
        zoom125Btn.addEventListener('click', () => setZoom('zoom-125'));
    }

    function setZoom(zoomClass) {
        // Remove all zoom classes
        printOutput.className = '';
        // Add selected zoom class
        printOutput.className = zoomClass;

        // Update active button state
        const allZoomBtns = [zoom50Btn, zoom75Btn, zoom100Btn, zoom125Btn];
        allZoomBtns.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        // Add active class to selected button
        const zoomBtnMap = {
            'zoom-50': zoom50Btn,
            'zoom-75': zoom75Btn,
            'zoom-100': zoom100Btn,
            'zoom-125': zoom125Btn
        };
        if (zoomBtnMap[zoomClass]) {
            zoomBtnMap[zoomClass].classList.add('active');
        }
    }

    function generatePrintPages(order) {
        printOutput.innerHTML = '';
        const groups = groupItemsByPackaging(order.list);
        const template = printPageTemplate.content;
        const MAX_ROWS_PER_PAGE = 22; // Maximum rows per page (Increased for A4)

        for (const pkgName in groups) {
            const group = groups[pkgName];
            const items = group.items;
            const totalPages = Math.ceil(items.length / MAX_ROWS_PER_PAGE);

            // Split items into pages
            for (let pageNum = 0; pageNum < totalPages; pageNum++) {
                const startIdx = pageNum * MAX_ROWS_PER_PAGE;
                const endIdx = Math.min(startIdx + MAX_ROWS_PER_PAGE, items.length);
                const pageItems = items.slice(startIdx, endIdx);

                const clone = document.importNode(template, true);

                // Fill Header with page number and inline date inputs
                const today = new Date().toISOString().split('T')[0];

                clone.querySelector('.p-supplier').textContent = PACKAGING_MAPPING.supplierName || '默认供应商';
                clone.querySelector('.p-customer').textContent = order.customerName;
                clone.querySelector('.p-code').textContent = order.code;
                clone.querySelector('.p-int-pkg').textContent = pkgName;
                clone.querySelector('.p-ext-pkg').textContent = group.externalName;
                clone.querySelector('.p-date').value = today;
                clone.querySelector('.p-delivery').value = today; // 默认也使用今天

                // Add page number if multiple pages
                if (totalPages > 1) {
                    const h1 = clone.querySelector('.print-header h1');
                    h1.innerHTML = `包装采购订单 <span style="font-size: 14px; font-weight: normal; color: #666;">(第${pageNum + 1}页/共${totalPages}页)</span>`;
                }

                // Fill Table
                const tbody = clone.querySelector('.p-tbody');
                let pageLeftTotal = 0;
                let pageRightTotal = 0;

                pageItems.forEach((item, index) => {
                    const qtyPair = parseQuantityPair(item.qty);
                    pageLeftTotal += qtyPair.left;
                    pageRightTotal += qtyPair.right;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${startIdx + index + 1}</td>
                        <td>${item.productModelName || '-'}</td>
                        <td>${item.spec}</td>
                        <td>${item.mb || '-'}</td>
                        <td>${qtyPair.left}</td>
                        <td>${qtyPair.right}</td>
                        <td contenteditable="true"></td>
                    `;
                    tbody.appendChild(tr);
                });

                // Add total row on last page
                if (pageNum === totalPages - 1) {
                    // Calculate total for all items in this packaging group
                    let totalLeft = 0;
                    let totalRight = 0;
                    items.forEach(item => {
                        const qtyPair = parseQuantityPair(item.qty);
                        totalLeft += qtyPair.left;
                        totalRight += qtyPair.right;
                    });

                    const totalRow = document.createElement('tr');
                    totalRow.className = 'total-row';
                    totalRow.innerHTML = `
                        <td colspan="4" style="text-align: right;">合计</td>
                        <td>${totalLeft}</td>
                        <td>${totalRight}</td>
                        <td></td>
                    `;
                    tbody.appendChild(totalRow);
                }

                printOutput.appendChild(clone);
            }
        }

        // Initialize zoom level
        printOutput.className = 'zoom-100';
    }

    function groupItemsByPackaging(items) {
        const groups = {};
        if (!items) return groups;

        items.forEach(item => {
            const internalName = item.bz || "无包装名称";
            const mappings = PACKAGING_MAPPING.mappings || PACKAGING_MAPPING;
            const externalName = mappings[internalName] || "未匹配";

            if (!groups[internalName]) {
                groups[internalName] = {
                    internalName: internalName,
                    externalName: externalName,
                    items: []
                };
            }
            groups[internalName].items.push(item);
        });
        return groups;
    }
});
