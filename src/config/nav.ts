export interface NavItem {
    title: string;
    href: string;
    icon?: string;
    number: string;
}

export const mainNav: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/',
        number: '01'
    },
    {
        title: 'Procurement',
        href: '/procurement',
        number: '02'
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
