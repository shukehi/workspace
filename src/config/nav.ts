export type NavIconKey =
    | 'dashboard'
    | 'source'
    | 'materials'
    | 'procurement'
    | 'inventory'
    | 'material-master'
    | 'material-catalog'
    | 'formula'
    | 'packaging-config'
    | 'cylinder-config'
    | 'lock-config'
    | 'handle-config'
    | 'lock-fork-config'
    | 'statistics'
    | 'contracts-history';

export interface NavItem {
    title: string;
    href: string;
    icon: NavIconKey;
}

export interface NavGroup {
    id: 'workflow' | 'config' | 'reports';
    title: string;
    items: NavItem[];
}

export const mainNavGroups: NavGroup[] = [
    {
        id: 'workflow',
        title: '业务流程',
        items: [
            { title: '仪表盘', href: '/', icon: 'dashboard' },
            { title: '原始订单', href: '/source', icon: 'source' },
            { title: '物料分析', href: '/materials', icon: 'materials' },
            { title: '采购管理', href: '/procurement', icon: 'procurement' },
            { title: '库存管理', href: '/inventory', icon: 'inventory' }
        ]
    },
    {
        id: 'config',
        title: '配置中心',
        items: [
            { title: '物料数据', href: '/material-master', icon: 'material-master' },
            { title: '物料目录配置', href: '/config/material-catalog', icon: 'material-catalog' },
            { title: '配方配置', href: '/formula', icon: 'formula' },
            { title: '包装配置', href: '/config/packaging', icon: 'packaging-config' },
            { title: '锁芯配置', href: '/config/cylinder', icon: 'cylinder-config' },
            { title: '锁具配置', href: '/config/lock', icon: 'lock-config' },
            { title: '拉手配置', href: '/config/handle', icon: 'handle-config' },
            { title: '锁叉配置', href: '/config/lock-fork', icon: 'lock-fork-config' }
        ]
    },
    {
        id: 'reports',
        title: '报表中心',
        items: [
            { title: '数据统计', href: '/statistics', icon: 'statistics' },
            { title: '历史合同', href: '/contracts-history', icon: 'contracts-history' }
        ]
    }
];

// Compatibility export for existing flat consumers.
export const flatMainNav: NavItem[] = mainNavGroups.flatMap((group) => group.items);
