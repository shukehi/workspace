import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/index.css'
import router from './router'
import App from './App.vue'
import { configLoader } from '@/services/configLoader'

if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  void import('./lib/mock')
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

configLoader.loadAll().catch(console.error);
