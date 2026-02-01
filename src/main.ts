import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/index.css'
import './lib/mock' // Initialize Mock
import router from './router'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
