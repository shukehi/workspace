/**
 * 状态管理系统
 *
 * 集中管理应用状态，替代分散的全局变量
 * 实现观察者模式
 */

class StateManager {
    constructor(initialState = {}) {
        this.state = {
            // 订单相关
            currentOrder: null,
            orderList: [],

            // UI 状态
            loading: false,
            error: null,

            // 用户信息（预留）
            user: null,

            // 合并状态（打印预览）
            mergeFlags: {},

            // 自定义初始状态
            ...initialState
        };

        this.listeners = [];
        this.stateHistory = []; // 用于调试和时间旅行
    }

    /**
     * 更新状态
     * @param {Object} updates - 要更新的状态
     */
    setState(updates) {
        const prevState = { ...this.state };

        this.state = {
            ...this.state,
            ...updates
        };

        // 记录状态历史
        if (this.stateHistory.length > 50) {
            this.stateHistory.shift(); // 保持最近 50 个状态
        }
        this.stateHistory.push({
            prev: prevState,
            current: { ...this.state },
            timestamp: new Date().toISOString()
        });

        // 通知所有监听器
        this.notify();
    }

    /**
     * 获取当前状态（返回副本，防止直接修改）
     * @returns {Object} 状态副本
     */
    getState() {
        return { ...this.state };
    }

    /**
     * 获取特定状态值
     * @param {string} key - 状态键名
     * @returns {*} 状态值
     */
    get(key) {
        return this.state[key];
    }

    /**
     * 订阅状态变化
     * @param {Function} listener - 监听器函数
     * @returns {Function} 取消订阅函数
     */
    subscribe(listener) {
        this.listeners.push(listener);

        // 立即调用一次（让订阅者获取当前状态）
        listener(this.state);

        // 返回取消订阅函数
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * 通知所有监听器
     */
    notify() {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('状态监听器错误:', error);
            }
        });
    }

    /**
     * 重置状态
     * @param {Object} newState - 新状态（可选）
     */
    reset(newState = {}) {
        this.state = {
            currentOrder: null,
            orderList: [],
            loading: false,
            error: null,
            user: null,
            mergeFlags: {},
            ...newState
        };
        this.notify();
    }

    /**
     * 获取状态历史（调试用）
     */
    getHistory() {
        return this.stateHistory;
    }

    /**
     * 回退到上一个状态（时间旅行）
     */
    undo() {
        if (this.stateHistory.length > 1) {
            const previous = this.stateHistory[this.stateHistory.length - 2];
            this.state = { ...previous.current };
            this.stateHistory.pop();
            this.notify();
        }
    }
}

// 导出单例实例
export const appState = new StateManager();

// 导出类供扩展使用
export default StateManager;
