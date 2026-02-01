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
        href: "/procurement", // Fixed duplicate href in previous file
        icon: "shopping-cart", // Added appropriate icon
        number: "03"
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
        title: "仪表盘",
        href: "/",
        number: "00"
    }
];
