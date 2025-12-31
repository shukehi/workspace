/**
 * App Navigation Web Component
 * 应用导航栏组件 - 消除 HTML 重复代码
 *
 * 功能：
 * - 封装导航HTML结构
 * - 当前页面高亮
 * - 移动端菜单切换
 * - 滚动样式变化
 */

class AppNavigation extends HTMLElement {
    constructor() {
        super();
        this.currentPage = this.getCurrentPage();
    }

    connectedCallback() {
        this.render();
        this.initFeatures();
    }

    /**
     * 渲染导航HTML
     */
    render() {
        this.innerHTML = `
            <nav class="main-navigation">
                <div class="nav-container">
                    <!-- Logo/品牌 -->
                    <a href="/index.html" class="nav-brand">
                        <span class="nav-title">订单管理系统</span>
                    </a>

                    <!-- 导航菜单 -->
                    <ul class="nav-menu">
                        <li class="nav-item">
                            <a href="/index.html" class="nav-link ${this.currentPage === 'orders' ? 'active' : ''}" data-page="orders">
                                <span>订单查询</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/inventory.html" class="nav-link ${this.currentPage === 'inventory' ? 'active' : ''}" data-page="inventory">
                                <span>库存管理</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/procurement.html" class="nav-link ${this.currentPage === 'procurement' ? 'active' : ''}" data-page="procurement">
                                <span>采购管理</span>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/statistics.html" class="nav-link ${this.currentPage === 'statistics' ? 'active' : ''}" data-page="statistics">
                                <span>数据统计</span>
                            </a>
                        </li>
                    </ul>

                    <!-- 移动端菜单按钮 -->
                    <button class="nav-toggle" aria-label="切换菜单">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    <!-- 用户信息 -->
                    <div class="nav-user">
                        <span class="user-name">管理员</span>
                    </div>
                </div>
            </nav>
        `;
    }

    /**
     * 初始化导航功能
     */
    initFeatures() {
        this.initMobileMenu();
        this.initScrollEffect();
        console.log(`✅ AppNavigation 初始化完成 - 当前页面: ${this.currentPage}`);
    }

    /**
     * 获取当前页面标识
     * @returns {string} 页面标识
     */
    getCurrentPage() {
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
    initMobileMenu() {
        const navToggle = this.querySelector('.nav-toggle');
        const navMenu = this.querySelector('.nav-menu');

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
        const navLinks = this.querySelectorAll('.nav-link');
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
    initScrollEffect() {
        const navigation = this.querySelector('.main-navigation');

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
}

// 注册自定义元素
customElements.define('app-navigation', AppNavigation);

// 导出组件类
export default AppNavigation;
