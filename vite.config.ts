import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const backendPort = Number(process.env.PORT || 3000)
const backendTarget = `http://localhost:${backendPort}`

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: backendTarget,
                changeOrigin: true
            },
            '/data': {
                target: backendTarget,
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist'
    }
})
