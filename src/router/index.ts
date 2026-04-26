import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/print-document',
            name: 'print-document',
            meta: { title: '打印文档', section: '打印中心' },
            component: () => import('@/views/PrintDocument.vue')
        },
        {
            path: '/',
            component: MainLayout,
            children: [
                {
                    path: '',
                    name: 'dashboard',
                    meta: { title: '仪表盘', section: '业务流程' },
                    component: () => import('@/views/Dashboard.vue') // Placeholder
                },
                {
                    path: '/formula',
                    name: 'formula',
                    meta: { title: '配方配置', section: '配置中心' },
                    component: () => import('@/views/ColorFormula.vue')
                },
                {
                    path: '/source',
                    name: 'source',
                    meta: { title: '原始订单', section: '业务流程' },
                    component: () => import('../views/Source.vue'),
                },
                {
                    path: '/materials',
                    name: 'materials',
                    meta: { title: '物料分析', section: '业务流程' },
                    component: () => import('../views/Materials.vue'),
                },
                {
                    path: '/inventory',
                    name: 'inventory',
                    meta: { title: '库存管理', section: '业务流程' },
                    component: () => import('@/views/Inventory.vue')
                },
                {
                    path: '/inventory/receipts/:id',
                    name: 'inventory-receipt-detail',
                    meta: { title: '入库单详情', section: '业务流程' },
                    component: () => import('@/views/InventoryReceiptDetail.vue')
                },
                {
                    path: '/procurement',
                    name: 'procurement',
                    meta: { title: '采购管理', section: '业务流程' },
                    component: () => import('@/views/Procurement.vue')
                },
                {
                    path: '/material-master',
                    name: 'material-master',
                    meta: { title: '物料数据', section: '配置中心' },
                    component: () => import('@/views/MaterialManagement.vue')
                },
                {
                    path: '/config/suppliers',
                    name: 'config-suppliers',
                    meta: { title: '供应商主数据', section: '配置中心' },
                    component: () => import('@/views/SupplierMaster.vue')
                },
                {
                    path: '/config/master-data-diagnostics',
                    name: 'config-master-data-diagnostics',
                    meta: { title: '主数据诊断', section: '配置中心' },
                    component: () => import('@/views/MasterDataDiagnostics.vue')
                },
                {
                    path: '/config/master-data-governance',
                    name: 'config-master-data-governance',
                    meta: { title: '主数据治理', section: '配置中心' },
                    component: () => import('@/views/MasterDataGovernance.vue')
                },
                {
                    path: '/config/material-catalog',
                    name: 'config-material-catalog',
                    meta: { title: '物料目录配置', section: '配置中心' },
                    component: () => import('@/views/MaterialCatalogConfig.vue')
                },
                {
                    path: '/config/packaging',
                    name: 'config-packaging',
                    meta: { title: '包装配置', section: '配置中心' },
                    component: () => import('@/views/PackagingConfig.vue')
                },
                {
                    path: '/config/cylinder',
                    name: 'config-cylinder',
                    meta: { title: '锁芯配置', section: '配置中心' },
                    component: () => import('@/views/CylinderConfig.vue')
                },
                {
                    path: '/config/lock',
                    name: 'config-lock',
                    meta: { title: '锁具配置', section: '配置中心' },
                    component: () => import('@/views/LockConfig.vue')
                },
                {
                    path: '/config/handle',
                    name: 'config-handle',
                    meta: { title: '拉手配置', section: '配置中心' },
                    component: () => import('@/views/HandleConfig.vue')
                },
                {
                    path: '/config/lock-fork',
                    name: 'config-lock-fork',
                    meta: { title: '锁叉配置', section: '配置中心' },
                    component: () => import('@/views/LockForkConfig.vue')
                },
                {
                    path: '/statistics',
                    name: 'statistics',
                    meta: { title: '数据统计', section: '报表中心' },
                    component: () => import('@/views/Statistics.vue')
                },
                {
                    path: '/contracts-history',
                    name: 'contracts-history',
                    meta: { title: '历史合同', section: '报表中心' },
                    component: () => import('@/views/ContractsHistory.vue')
                }
            ]
        }
    ]
})

export default router
