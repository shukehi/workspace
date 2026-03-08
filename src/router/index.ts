import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/print-document',
            name: 'print-document',
            component: () => import('@/views/PrintDocument.vue')
        },
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
                },
                {
                    path: '/material-master',
                    name: 'material-master',
                    component: () => import('@/views/MaterialManagement.vue')
                },
                {
                    path: '/config/packaging',
                    name: 'config-packaging',
                    component: () => import('@/views/PackagingConfig.vue')
                },
                {
                    path: '/config/cylinder',
                    name: 'config-cylinder',
                    component: () => import('@/views/CylinderConfig.vue')
                },
                {
                    path: '/config/handle',
                    name: 'config-handle',
                    component: () => import('@/views/HandleConfig.vue')
                },
                {
                    path: '/config/lock-fork',
                    name: 'config-lock-fork',
                    component: () => import('@/views/LockForkConfig.vue')
                },
                {
                    path: '/statistics',
                    name: 'statistics',
                    component: () => import('@/views/Statistics.vue')
                },
                {
                    path: '/contracts-history',
                    name: 'contracts-history',
                    component: () => import('@/views/ContractsHistory.vue')
                }
            ]
        }
    ]
})

export default router
