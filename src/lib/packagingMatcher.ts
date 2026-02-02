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
    private rules: PackagingRule[] = [
        // Rules derived from legacy packaging-mapping.json
        // Using regex allows partial matching and ignores whitespace/case
        { pattern: /罗曼蒂克/i, target: "罗曼蒂克" },
        { pattern: /美\+C.*单瓦/i, target: "美+C单瓦" }, // Matches "3层黄卡美+C单瓦纸箱"
        { pattern: /白卡.*三层/i, target: "白+C单瓦+二层高瓦" },
        { pattern: /美\+C.*五层/i, target: "美+C五层" },
        { pattern: /五层.*白卡.*加硬/i, target: "白+C五层加硬" },
        { pattern: /5层.*白卡.*加硬/i, target: "白+C五层加硬" },
        { pattern: /美\+C.*二层高瓦/i, target: "美+C单瓦+二层高瓦" },
        { pattern: /美\+C.*双瓦.*BE瓦/i, target: "美+C双瓦二层高瓦(BE瓦)" },
        { pattern: /五层.*黄卡.*加硬/i, target: "B+C五层加硬" },
        { pattern: /5层.*黄卡.*加硬/i, target: "B+C五层加硬" },
        { pattern: /俄卡.*C.*双瓦/i, target: "俄卡*C双瓦" },

        // Catch-all patterns for common variations (Future proofing)
        { pattern: /单瓦/i, target: "单瓦通用" },
    ];

    /**
     * Normalize the input string:
     * - Trim whitespace
     * - Convert to lower case (optional, but regex handles i flag)
     * - Normalize punctuation if needed
     */
    private normalize(input: string): string {
        return input ? input.trim() : '';
    }

    /**
     * Find the best matching packaging name
     * @param internalName The name from the source system (e.g., '3层黄卡美+C单瓦纸箱')
     * @returns The standardized supplier name, or the internal name if no match found
     */
    public match(internalName: string): string {
        if (!internalName) return "未知包装";

        const normalizedInput = this.normalize(internalName);

        // Sort rules by priority (if we add priority later), currently order matters
        for (const rule of this.rules) {
            if (rule.pattern.test(normalizedInput)) {
                // console.debug(`✅ Matched '${internalName}' to '${rule.target}' via ${rule.pattern}`);
                return rule.target;
            }
        }

        return `${internalName} (未匹配)`;
    }

    /**
     * Add a new rule dynamically
     */
    public addRule(rule: PackagingRule) {
        this.rules.unshift(rule); // Add to top for higher priority
    }
}

export const packagingMatcher = new PackagingMatcher();
