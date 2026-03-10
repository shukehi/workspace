import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/index.css'
import router from './router'
import App from './App.vue'
import { initializeConfigRuntime } from '@/services/configRuntime'

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');

  initializeConfigRuntime().catch(console.error);
}

void bootstrap();
