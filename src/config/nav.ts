export interface NavItem {
    title: string;
    href: string;
    icon?: string;
    number: string;
}

export const mainNav: NavItem[] = [
    {
        title: "Data Source",
        href: "/source",
        icon: "database", // Simplified string for now, icon component handled in Sidebar
        number: "00"
    },
    {
        title: 'Dashboard',
        href: '/',
        number: '01'
    },
    {
        title: 'Procurement',
        href: "/source",
        icon: "database",
        number: "01"
    },
    {
        title: "Materials",
        href: "/materials",
        icon: "box",
        number: "02"
    },
    {
        title: 'Inventory',
        href: '/inventory',
        number: '03'
    },
    {
        title: 'Color Formula',
        href: '/formula',
        number: '04'
    }
];
