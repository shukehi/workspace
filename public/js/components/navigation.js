/**
 * 导航栏组件
 * V2.0 顶部导航系统
 *
 * 功能：
 * - 当前页面高亮
 * - 移动端菜单切换
 * - 滚动样式变化
 */

/**
 * 初始化导航功能
 */
export function initNavigation() {
    // 高亮当前页面
    highlightCurrentPage();

    // 初始化移动端菜单
    initMobileMenu();

    // 初始化滚动效果
    initScrollEffect();

    console.log('✅ Navigation 模块初始化完成');
}

/**
 * 高亮当前页面导航项
 */
function highlightCurrentPage() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPage = link.dataset.page;

        if (linkPage === currentPage) {
            link.classList.add('active');
            console.log(`📍 当前页面: ${currentPage}`);
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * 获取当前页面标识
 * @returns {string} 页面标识
 */
function getCurrentPage() {
    const path = window.location.pathname;

    if (path.includes('inventory')) return 'inventory';
    if (path.includes('procurement')) return 'procurement';
    if (path.includes('statistics')) return 'statistics';

    // 默认为订单查询（首页）
    return 'orders';
}

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (!navToggle || !navMenu) {
        console.warn('⚠️ 导航菜单元素未找到');
        return;
    }

    // 切换菜单
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');

        // 防止背景滚动
        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    // 点击链接后关闭菜单
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // 窗口大小改变时重置
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

/**
 * 初始化滚动效果
 */
function initScrollEffect() {
    const navigation = document.querySelector('.main-navigation');

    if (!navigation) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // 滚动超过 50px 时添加阴影效果
        if (currentScroll > 50) {
            navigation.classList.add('scrolled');
        } else {
            navigation.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

/**
 * 页面导航辅助函数
 * @param {string} page - 页面标识
 */
export function navigateTo(page) {
    const pageMap = {
        'orders': '/index.html',
        'inventory': '/inventory.html',
        'procurement': '/procurement.html',
        'statistics': '/statistics.html'
    };

    const url = pageMap[page];
    if (url) {
        window.location.href = url;
    } else {
        console.error(`❌ 未知页面: ${page}`);
    }
}

/**
 * 获取导航菜单配置
 * @returns {Array} 菜单项配置
 */
export function getNavigationConfig() {
    return [
        {
            id: 'orders',
            name: '订单查询',
            icon: '📋',
            url: '/index.html',
            description: '查询订单详情和商品明细'
        },
        {
            id: 'inventory',
            name: '库存管理',
            icon: '📊',
            url: '/inventory.html',
            description: '管理商品库存和出入库记录'
        },
        {
            id: 'procurement',
            name: '采购管理',
            icon: '🛒',
            url: '/procurement.html',
            description: '管理采购订单和供应商信息'
        },
        {
            id: 'statistics',
            name: '数据统计',
            icon: '📈',
            url: '/statistics.html',
            description: '查看销售数据和统计报表'
        }
    ];
}
