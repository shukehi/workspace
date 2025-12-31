/**
 * 应用入口文件
 * 协调各模块的初始化
 *
 * ✨ 已重构：初始化所有组件，使用事件驱动架构
 */

import { loadPackagingMapping } from './config/index.js';
import { initNavigation } from './components/navigation.js';
import { initSearch } from './components/search.js';
import { initOrderDisplay } from './components/orderDisplay.js';
import { initPOWorkflow } from './components/poWorkflow.js';

/**
 * 应用初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 开始初始化应用...');

    // 1. 初始化导航系统
    initNavigation();
    console.log('✅ 导航系统初始化完成');

    // 2. 加载配置
    await loadPackagingMapping();
    console.log('✅ 配置加载完成');

    // 3. 初始化各功能模块（顺序：核心组件 -> UI组件）
    initSearch();          // 搜索模块（触发事件）
    initOrderDisplay();    // 订单展示（监听事件）
    initPOWorkflow();      // 采购单工作流（生成、打印、导出）

    console.log('✅ 应用初始化完成 - 所有组件已就绪');
});
