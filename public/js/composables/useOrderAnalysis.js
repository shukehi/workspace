
const { computed } = Vue;

export function useOrderAnalysis() {

    // Define keywords for analysis
    const keywords = [
        { term: '锁芯', type: 'cylinder', label: '疑似锁芯需求' },
        { term: '锁心', type: 'cylinder', label: '疑似锁芯需求' },
        { term: '把手', type: 'hardware', label: '疑似五金-把手' },
        { term: '拉手', type: 'hardware', label: '疑似五金-拉手' },
        { term: '合页', type: 'hardware', label: '疑似五金-合页' },
        { term: '螺丝', type: 'hardware', label: '疑似五金-螺丝' }
    ];

    const getIcon = (type) => {
        if (type === 'cylinder') return '🔐';
        if (type === 'hardware') return '🔩';
        return '⚠️';
    };

    /**
     * Analyze an order object and return a list of alerts
     * @param {Object} order - The order object to analyze
     * @returns {Array} List of alert objects
     */
    const analyzeOrder = (order) => {
        const found = [];
        if (!order) return found;

        // 1. Analyze Remark
        if (order.remark) {
            keywords.forEach(kw => {
                if (order.remark.includes(kw.term)) {
                    if (!found.some(f => f.message === kw.label)) {
                        found.push({
                            type: kw.type,
                            message: kw.label,
                            icon: getIcon(kw.type)
                        });
                    }
                }
            });
        }

        // 2. Analyze List Items (Non-standard detection)
        if (order.list) {
            const nonStandardCount = order.list.filter(item =>
                (item.bz && item.bz.includes('非标')) ||
                (item.xsbz && item.xsbz.includes('非标'))
            ).length;

            if (nonStandardCount > 0) {
                found.push({
                    type: 'warning',
                    message: `${nonStandardCount} 项非标产品`,
                    icon: '⚠️'
                });
            }
        }

        return found;
    };

    return {
        analyzeOrder
    };
}
