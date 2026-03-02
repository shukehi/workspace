export interface NavItem {
    title: string;
    href: string;
    icon?: string;
    number: string;
}

export const mainNav: NavItem[] = [
    {
        title: "原始订单",
        href: "/source",
        icon: "database",
        number: "01"
    },
    {
        title: "物料分析",
        href: "/materials",
        icon: "box",
        number: "02"
    },
    {
        title: "采购管理",
        href: "/procurement",
        icon: "shopping-cart",
        number: "03"
    },
    {
        title: "物料数据",
        href: "/material-master",
        icon: "clipboard-list",
        number: "03+"
    },
    {
        title: "库存管理",
        href: "/inventory",
        number: "04"
    },
    {
        title: "配方配置",
        href: "/formula",
        number: "05"
    },
    {
        title: "数据统计",
        href: "/statistics",
        icon: "bar-chart",
        number: "06"
    },
    {
        title: "仪表盘",
        href: "/",
        number: "00"
    }
];
