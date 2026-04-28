export type NavIconKey =
    | 'dashboard'
    | 'source'
    | 'materials'
    | 'procurement'
    | 'inventory'
    | 'material-master'
    | 'supplier-master'
    | 'master-data-diagnostics'
    | 'master-data-governance'
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

export type ConfigCenterRoute =
    | '/formula'
    | '/material-master'
    | '/config/suppliers'
    | '/config/master-data-diagnostics'
    | '/config/master-data-governance'
    | '/config/material-catalog'
    | '/config/packaging'
    | '/config/cylinder'
    | '/config/lock'
    | '/config/handle'
    | '/config/lock-fork';

export type ConfigCenterNavGroupId =
    | 'rule-exceptions'
    | 'workbench'
    | 'master-data-repair'
    | 'governance-admin-fallback';

export interface ConfigCenterNavItem extends NavItem {
    href: ConfigCenterRoute;
    operatorIntentLabel: string;
    operatorIntentDescription: string;
}

export interface ConfigCenterNavGroup {
    id: ConfigCenterNavGroupId;
    title: string;
    operatorIntentLabel: string;
    description: string;
    items: ConfigCenterNavItem[];
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
            { title: '供应商主数据', href: '/config/suppliers', icon: 'supplier-master' },
            { title: '主数据诊断', href: '/config/master-data-diagnostics', icon: 'master-data-diagnostics' },
            { title: '主数据治理', href: '/config/master-data-governance', icon: 'master-data-governance' },
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

function findConfigCenterNavItem(href: ConfigCenterRoute): NavItem & { href: ConfigCenterRoute } {
    const configNavItem = mainNavGroups
        .find((group) => group.id === 'config')
        ?.items.find((item) => item.href === href);

    if (!configNavItem) {
        throw new Error(`Missing Config Center navigation item for ${href}`);
    }

    return configNavItem as NavItem & { href: ConfigCenterRoute };
}

function configCenterItem(
    href: ConfigCenterRoute,
    operatorIntentLabel: string,
    operatorIntentDescription: string,
    title?: string
): ConfigCenterNavItem {
    return {
        ...findConfigCenterNavItem(href),
        ...(title ? { title } : {}),
        operatorIntentLabel,
        operatorIntentDescription
    };
}

export const configCenterNavGroups: ConfigCenterNavGroup[] = [
    {
        id: 'rule-exceptions',
        title: '规则例外维护',
        operatorIntentLabel: '维护例外规则',
        description: '包装、锁芯、锁具、拉手、锁叉等人工例外映射集中维护。',
        items: [
            configCenterItem('/config/packaging', '维护包装例外', '维护包装名称到标准物料的例外映射。'),
            configCenterItem('/config/lock', '维护锁具例外', '维护锁具型号与标准物料的例外映射。'),
            configCenterItem('/config/handle', '维护拉手例外', '维护拉手型号与标准物料的例外映射。'),
            configCenterItem('/config/cylinder', '维护锁芯例外', '维护锁芯型号与标准物料的例外映射。'),
            configCenterItem('/config/lock-fork', '维护锁叉例外', '维护锁叉配置契约与默认供应商映射。')
        ]
    },
    {
        id: 'workbench',
        title: '配方工作台',
        operatorIntentLabel: '审核发布配方',
        description: '审核、编辑、发布配方，并检查配方对主数据的引用影响。',
        items: [
            configCenterItem('/formula', '审核发布配方', '维护色粉配方并完成发布前的差异、影响和引用检查。')
        ]
    },
    {
        id: 'master-data-repair',
        title: '主数据修复与归属',
        operatorIntentLabel: '修复主数据',
        description: '维护物料与供应商主数据，补齐归属关系并处理引用异常。',
        items: [
            configCenterItem('/material-master', '修复物料主数据', '维护物料主数据和 Supplier Master 关联关系。'),
            configCenterItem('/config/suppliers', '维护供应商主数据', '维护供应商主数据、状态、审计和关联物料。')
        ]
    },
    {
        id: 'governance-admin-fallback',
        title: '治理审核与管理员兜底',
        operatorIntentLabel: '治理审核 / 高级兜底',
        description: '查看统一诊断、治理看板，并保留原始物料目录 JSON 的高级管理员兜底入口。',
        items: [
            configCenterItem('/config/master-data-diagnostics', '排查主数据异常', '集中查看物料和供应商主数据异常。'),
            configCenterItem('/config/master-data-governance', '审核治理状态', '查看治理状态总览、近期活动和处理焦点。'),
            configCenterItem(
                '/config/material-catalog',
                '高级管理员 JSON 兜底',
                '保留原始物料目录 JSON 配置入口，仅作为高级管理员兜底。',
                '物料目录 JSON 兜底'
            )
        ]
    }
];

// Compatibility export for existing flat consumers.
export const flatMainNav: NavItem[] = mainNavGroups.flatMap((group) => group.items);
