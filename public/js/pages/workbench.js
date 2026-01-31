/**
 * Workbench Entry Point (Pure Vue 3 SPA)
 * 
 * Init the Vue Application.
 */

import { loadPackagingMapping, loadCylinderMapping, loadLockForkMapping, loadMaterialsCatalog, loadColorFormulas } from '../config/index.js';
import { initNavigation } from '../components/navigation.js';
import { WorkbenchApp } from '../components-vue/WorkbenchApp.js';

const { createApp } = Vue;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Workbench initializing (Full SPA Mode)...');

    // 1. Init Navigation (Web Component)
    initNavigation();

    // 2. Load Config
    await Promise.all([
        loadPackagingMapping(),
        loadCylinderMapping(),
        loadLockForkMapping(),
        loadMaterialsCatalog(),
        loadColorFormulas()
    ]);
    console.log('✅ Config loaded');

    // 3. Mount Vue App
    const app = createApp(WorkbenchApp);
    app.mount('#app');
    window.mainVue = app;

    console.log('✅ Workbench ready');
});
