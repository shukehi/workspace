/**
 * 事件总线系统
 *
 * 用于组件间通信，替代全局变量
 * 实现发布-订阅模式
 */

class EventBus {
    constructor() {
        this.events = {};
        this.eventHistory = []; // 用于调试
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅函数
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }

        this.events[event].push(callback);

        // 返回取消订阅函数
        return () => this.off(event, callback);
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件处理器错误 [${event}]:`, error);
                }
            });
        }

        // 记录事件历史（开发环境）
        if (this.eventHistory.length > 100) {
            this.eventHistory.shift(); // 保持最近 100 个事件
        }
        this.eventHistory.push({
            event,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 取消订阅
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    /**
     * 订阅一次性事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    once(event, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }

    /**
     * 清除所有事件监听器
     */
    clear() {
        this.events = {};
        this.eventHistory = [];
    }

    /**
     * 获取事件历史（调试用）
     */
    getHistory() {
        return this.eventHistory;
    }
}

// 导出单例实例
export const eventBus = new EventBus();

// 导出类供扩展使用
export default EventBus;
