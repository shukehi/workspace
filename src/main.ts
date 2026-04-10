import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/index.css'
import router from './router'
import App from './App.vue'
import { initializeConfigRuntime } from '@/services/configRuntime'

function renderBootstrapFailure(message: string) {
  const root = document.querySelector('#app');
  if (!root) return;

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;color:#0f172a;">
      <div style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
        <div style="font-size:20px;font-weight:700;margin-bottom:12px;">配置加载失败</div>
        <div style="font-size:14px;line-height:1.7;color:#475569;">系统未检测到完整的 published 配置，已阻止进入主应用。请先修复 mapping/material 配置后再刷新页面。</div>
        <pre style="margin-top:16px;padding:12px;border-radius:12px;background:#f1f5f9;color:#334155;font-size:12px;white-space:pre-wrap;word-break:break-word;">${message}</pre>
      </div>
    </div>
  `;
}

async function bootstrap() {
  try {
    await initializeConfigRuntime();
  } catch (error) {
    console.error('Failed to initialize config runtime', error);
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    renderBootstrapFailure(message);
    return;
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}

void bootstrap();
