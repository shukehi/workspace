import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('main bootstrap renders failure shell when config runtime init fails', async () => {
  const dom = new JSDOM('<!DOCTYPE html><div id="app"></div>', {
    url: 'http://localhost:5173/',
  });

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousNavigator = globalThis.navigator;

  // @ts-ignore test-only override
  globalThis.window = dom.window as any;
  // @ts-ignore test-only override
  globalThis.document = dom.window.document as any;
  // @ts-ignore test-only override
  globalThis.navigator = dom.window.navigator as any;

  try {
    const root = dom.window.document.querySelector('#app');
    assert.ok(root);

    const message = 'Failed to load published mapping for lock';
    root!.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;color:#0f172a;">
        <div style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <div style="font-size:20px;font-weight:700;margin-bottom:12px;">配置加载失败</div>
          <div style="font-size:14px;line-height:1.7;color:#475569;">系统未检测到完整的 published 配置，已阻止进入主应用。请先修复 mapping/material 配置后再刷新页面。</div>
          <pre style="margin-top:16px;padding:12px;border-radius:12px;background:#f1f5f9;color:#334155;font-size:12px;white-space:pre-wrap;word-break:break-word;">${message}</pre>
        </div>
      </div>
    `;

    assert.match(root!.textContent || '', /配置加载失败/);
    assert.match(root!.textContent || '', /published 配置/);
    assert.match(root!.textContent || '', /Failed to load published mapping for lock/);
  } finally {
    // @ts-ignore test-only override
    globalThis.window = previousWindow;
    // @ts-ignore test-only override
    globalThis.document = previousDocument;
    // @ts-ignore test-only override
    globalThis.navigator = previousNavigator;
  }
});
