import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: MainLayout,
            children: [
                {
                    path: '',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue') // Placeholder
                },
                {
                    path: '/formula',
                    name: 'formula',
                    component: () => import('@/views/ColorFormula.vue')
                },
                {
                    path: '/source',
                    name: 'source',
                    component: () => import('../views/Source.vue'),
                },
                {
                    path: '/materials',
                    name: 'materials',
                    component: () => import('../views/Materials.vue'),
                },
                {
                    path: '/inventory',
                    name: 'inventory',
                    component: () => import('@/views/Inventory.vue')
                },
                {
                    path: '/procurement',
                    name: 'procurement',
                    component: () => import('@/views/Procurement.vue')
                }
            ]
        }
    ]
})

export default router
