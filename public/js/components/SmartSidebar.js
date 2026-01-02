/**
 * Smart Sidebar Component
 * 
 * Responsible for:
 * 1. Parsing remarks for keywords (Smart detection)
 * 2. Rendering alert cards in the sidebar
 * 3. Handling quick actions from alerts
 */

export class SmartSidebar {
    constructor() {
        this.container = document.getElementById('alertsContainer');
        this.remarkBox = document.getElementById('orderRemark');

        // Define keywords to watch for
        this.keywords = [
            { term: '锁芯', type: 'cylinder', label: '疑似锁芯需求' },
            { term: '锁心', type: 'cylinder', label: '疑似锁芯需求' },
            { term: '把手', type: 'hardware', label: '疑似五金-把手' },
            { term: '拉手', type: 'hardware', label: '疑似五金-拉手' },
            { term: '合页', type: 'hardware', label: '疑似五金-合页' },
            { term: '螺丝', type: 'hardware', label: '疑似五金-螺丝' }
        ];
    }

    /**
     * Analyze order for anomalies and remarks
     * @param {Object} order - Full order object
     */
    analyze(order) {
        this.clear();
        const alerts = [];

        // 1. Analyze Remark Field
        if (order.remark) {
            const remarkAlerts = this.scanText(order.remark);
            alerts.push(...remarkAlerts);
        }

        // 2. Analyze List Items (e.g. Look for "非标" in plain text)
        if (order.list && Array.isArray(order.list)) {
            const nonStandardCount = order.list.filter(item =>
                (item.bz && item.bz.includes('非标')) ||
                (item.xsbz && item.xsbz.includes('非标'))
            ).length;

            if (nonStandardCount > 0) {
                alerts.push({
                    type: 'warning',
                    message: `${nonStandardCount} 项非标产品`
                });
            }
        }

        // 3. Render
        if (alerts.length > 0) {
            this.renderAlerts(alerts);
            this.container.classList.remove('hidden');
        } else {
            this.container.classList.add('hidden');
        }
    }

    /**
     * Scan text for known keywords
     * @param {string} text 
     * @returns {Array} Found alerts
     */
    scanText(text) {
        const found = [];
        this.keywords.forEach(kw => {
            if (text.includes(kw.term)) {
                // Avoid duplicate alerts for same type if already found? 
                // For now, simple includes check.
                if (!found.some(f => f.message === kw.label)) {
                    found.push({
                        type: kw.type,
                        message: kw.label,
                        match: kw.term
                    });
                }
            }
        });
        return found;
    }

    /**
     * Clear previous alerts
     */
    clear() {
        this.container.innerHTML = '';
        this.container.classList.add('hidden');
    }

    /**
     * Render alert cards
     * @param {Array} alerts 
     */
    renderAlerts(alerts) {
        alerts.forEach(alert => {
            const card = document.createElement('div');
            card.className = 'alert-item';

            // Determine icon based on type
            let icon = '⚠️';
            if (alert.type === 'cylinder') icon = '🔐';
            if (alert.type === 'hardware') icon = '🔩';

            card.innerHTML = `
                <span>${icon} ${alert.message}</span>
                <!-- Action button could go here -->
            `;

            // Add action button for specific types if needed
            if (alert.type === 'cylinder') {
                const btn = document.createElement('button');
                btn.className = 'alert-action';
                btn.textContent = '查看';
                btn.onclick = () => {
                    document.querySelector('.hub-tab[data-tab="cylinder"]').click();
                };
                card.appendChild(btn);
            }

            this.container.appendChild(card);
        });
    }
}

// Singleton instance
export const smartSidebar = new SmartSidebar();
