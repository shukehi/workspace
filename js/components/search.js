/**
 * 搜索功能模块
 * 处理订单搜索交互和状态管理
 */

import { fetchOrderDetail } from '../api.js';
import { renderOrder } from './orderDisplay.js';

/**
 * 初始化搜索功能
 */
export function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const orderCodeInput = document.getElementById('orderCodeInput');
    const errorMsg = document.getElementById('errorMsg');
    const resultContainer = document.getElementById('resultContainer');

    // 绑定事件监听器
    searchBtn.addEventListener('click', handleSearch);
    orderCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    async function handleSearch() {
        const code = orderCodeInput.value.trim();

        // 重置状态
        errorMsg.textContent = '';
        resultContainer.classList.add('hidden');

        if (!code) {
            errorMsg.textContent = '请输入订单号';
            return;
        }

        setLoading(true);

        try {
            const data = await fetchOrderDetail(code);

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
}
