// @ts-nocheck
/**
 * Data Normalizer
 * Standardizes data structures to ensure consistency across the application.
 * Prevents "undefined" errors by filling missing fields with defaults.
 */

export const DataNormalizer = {
    /**
     * Normalizes a single material object
     * Ensures 'model', 'id', 'type', 'supplier' always exist.
     * Handles legacy 'name' field by mapping it to 'model'.
     * @param {string} key - The material ID key
     * @param {Object} rawMaterial - The raw material data object
     * @returns {Object} Normalized material object
     */
    normalizeMaterial(key, rawMaterial) {
        if (!rawMaterial) {
            return {
                id: key,
                model: key,
                type: '未分类',
                supplier: '未知',
                unit: '个',
                packageSpec: '-'
            };
        }

        // Logic to fix legacy data: if model is missing, use name. If both missing, use key (ID).
        const model = rawMaterial.model || rawMaterial.name || key;

        return {
            ...rawMaterial, // Keep other existing fields
            id: rawMaterial.id || key,
            model: model, // Enforce 'model' property
            name: model,  // Keep 'name' synced for backward compatibility if any old code uses it
            type: rawMaterial.type || '未分类',
            supplier: rawMaterial.supplier || '未知',
            unit: rawMaterial.unit || '个',
            packageSpec: rawMaterial.packageSpec || '-',
            // Ensure numeric fields are numbers
            minOrder: Number(rawMaterial.minOrder) || 0,
            unitPrice: Number(rawMaterial.unitPrice) || 0
        };
    },

    /**
     * Normalizes a complete materials catalog
     * @param {Object} catalog - Raw catalog object { "id1": {data}, "id2": {data} }
     * @returns {Object} Normalized catalog
     */
    normalizeMaterialCatalog(catalog) {
        if (!catalog || typeof catalog !== 'object') return {};

        const normalized = {};
        Object.keys(catalog).forEach(key => {
            normalized[key] = this.normalizeMaterial(key, catalog[key]);
        });
        return normalized;
    }
};
