export interface PackagingRule {
    pattern: RegExp;
    target: string;
    priority?: number; // Higher number = higher priority
}

/**
 * Packaging Matcher Service
 * Replaces the legacy key-value mapping with robust regex-based matching.
 */
class PackagingMatcher {
    // Minimal fallback rules. Primary matching comes from mapping JSON.
    private fallbackRules: PackagingRule[] = [
        { pattern: /单瓦/i, target: "单瓦通用" },
    ];
    private exactMap = new Map<string, string>();
    private normalizedMap = new Map<string, string>();
    private normalizedKeysByLength: string[] = [];
    private mappingVersion = '';
    private unmatchedCounts = new Map<string, number>();

    /**
     * Normalize the input string:
     * - Trim whitespace
     * - Convert to lower case (optional, but regex handles i flag)
     * - Normalize punctuation if needed
     */
    private normalize(input: string): string {
        if (!input) return '';
        return input
            .trim()
            .toLowerCase()
            .replace(/[（【［]/g, '(')
            .replace(/[）】］]/g, ')')
            .replace(/\s+/g, '');
    }

    private computeMappingVersion(mappingObj: Record<string, any>): string {
        const pairs = Object.entries(mappingObj)
            .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=>${v}`);
        return pairs.join('|');
    }

    public syncFromMapping(packagingMapping: any) {
        const mappingObj = (packagingMapping?.mappings || packagingMapping || {}) as Record<string, any>;
        const nextVersion = this.computeMappingVersion(mappingObj);
        if (!nextVersion || nextVersion === this.mappingVersion) return;

        this.exactMap.clear();
        this.normalizedMap.clear();

        Object.entries(mappingObj).forEach(([rawKey, rawValue]) => {
            if (typeof rawKey !== 'string' || typeof rawValue !== 'string') return;
            const key = rawKey.trim();
            const value = rawValue.trim();
            if (!key || !value) return;

            this.exactMap.set(key, value);
            this.normalizedMap.set(this.normalize(key), value);
        });

        this.normalizedKeysByLength = Array.from(this.normalizedMap.keys())
            .sort((a, b) => b.length - a.length);
        this.mappingVersion = nextVersion;
    }

    /**
     * Find the best matching packaging name
     * @param internalName The name from the source system (e.g., '3层黄卡美+C单瓦纸箱')
     * @returns The standardized supplier name, or the internal name if no match found
     */
    public match(internalName: string): string {
        if (!internalName) return "未知包装";

        const rawInput = internalName.trim();
        if (this.exactMap.has(rawInput)) {
            return this.exactMap.get(rawInput)!;
        }

        const normalizedInput = this.normalize(rawInput);
        if (this.normalizedMap.has(normalizedInput)) {
            return this.normalizedMap.get(normalizedInput)!;
        }

        for (const key of this.normalizedKeysByLength) {
            if (key && normalizedInput.includes(key)) {
                return this.normalizedMap.get(key)!;
            }
        }

        for (const rule of this.fallbackRules) {
            if (rule.pattern.test(normalizedInput)) {
                return rule.target;
            }
        }

        this.unmatchedCounts.set(rawInput, (this.unmatchedCounts.get(rawInput) || 0) + 1);
        return `${internalName} (未匹配)`;
    }

    /**
     * Add a new rule dynamically
     */
    public addRule(rule: PackagingRule) {
        this.fallbackRules.unshift(rule); // Add to top for higher priority
    }

    public consumeUnmatchedSummary(limit = 10) {
        if (this.unmatchedCounts.size === 0) return [];
        const summary = Array.from(this.unmatchedCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
        this.unmatchedCounts.clear();
        return summary;
    }
}

export const packagingMatcher = new PackagingMatcher();
