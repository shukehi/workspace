/**
 * 搜索功能模块
 * 处理订单搜索交互和状态管理
 *
 * ✨ 已重构：使用事件总线和状态管理
 */

import { fetchOrderDetail } from '../api.js';
import { eventBus } from '../core/eventBus.js';
import { appState } from '../core/state.js';
import { validateOrderData, formatError } from '../utils.js';

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

    // 订阅状态变化，同步 UI
    appState.subscribe((state) => {
        // 更新加载状态
        setLoading(state.loading);

        // 显示错误信息
        if (state.error) {
            errorMsg.textContent = state.error;
            resultContainer.classList.add('hidden');
        } else {
            errorMsg.textContent = '';
        }

        // 显示结果容器
        if (state.currentOrder) {
            resultContainer.classList.remove('hidden');
        }
    });

    async function handleSearch() {
        const code = orderCodeInput.value.trim();

        // 验证输入
        if (!code) {
            appState.setState({ error: '请输入订单号' });
            return;
        }

        // 清除之前的错误和结果
        appState.setState({
            error: null,
            loading: true,
            currentOrder: null
        });

        try {
            const data = await fetchOrderDetail(code);

            // 验证数据结构
            const validation = validateOrderData(data);

            if (!validation.valid) {
                const errorMsg = validation.errors.join('；');
                appState.setState({
                    error: errorMsg,
                    loading: false
                });
                console.warn('⚠️ 数据验证失败:', validation.errors);
                return;
            }

            // 更新状态
            appState.setState({
                currentOrder: data.rows[0],
                error: null,
                loading: false
            });

            // 触发事件，通知其他组件
            eventBus.emit('order:loaded', data.rows[0]);

            console.log('✅ 订单加载成功:', data.rows[0].code);

        } catch (error) {
            console.error('❌ 查询错误:', error);

            // 使用格式化的错误信息
            const errorMsg = formatError(error);

            appState.setState({
                error: errorMsg,
                loading: false,
                currentOrder: null
            });
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
