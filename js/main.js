/**
 * 应用入口文件
 * 协调各模块的初始化
 */

import { loadPackagingMapping } from './config.js';
import { initSearch } from './components/search.js';
import { initPrintPreview } from './components/printPreview.js';

/**
 * 应用初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 加载配置
    await loadPackagingMapping();

    // 2. 初始化各功能模块
    initSearch();
    initPrintPreview();

    console.log('✅ 应用初始化完成');
});
