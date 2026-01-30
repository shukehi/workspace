/**
 * Configuration Exporter/Importer
 * Handles export and import of materials catalog and color formulas
 */

/**
 * Export configuration data to JSON file
 * @param {Object} materials - Materials catalog object
 * @param {Object} formulas - Color formulas object
 * @param {string} userNote - Optional user note for this export
 */
export function exportConfig(materials, formulas, userNote = '') {
    const exportData = {
        metadata: {
            version: '1.0',
            exportTime: new Date().toISOString(),
            appVersion: 'v1.6',
            userNote: userNote,
            itemCounts: {
                materials: Object.keys(materials || {}).length,
                formulas: Object.keys(formulas || {}).length
            }
        },
        materials: materials || {},
        formulas: formulas || {}
    };

    const timestamp = new Date().toISOString()
        .replace(/:/g, '')
        .replace(/\..+/, '')
        .replace('T', '_');

    const filename = `配方数据_${timestamp}.json`;

    downloadJSON(exportData, filename);

    console.log('✅ 配方数据已导出:', filename);
    return exportData;
}

/**
 * Download data as JSON file
 * @param {Object} data - Data to download
 * @param {string} filename - Filename for download
 */
export function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

/**
 * Import configuration from JSON file
 * @param {File} file - JSON file to import
 * @returns {Promise<Object>} Parsed configuration data
 */
export async function importConfig(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const validation = validateConfig(data);

                if (!validation.valid) {
                    reject(new Error(validation.error));
                    return;
                }

                resolve(data);
            } catch (error) {
                reject(new Error('JSON 格式错误: ' + error.message));
            }
        };

        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };

        reader.readAsText(file);
    });
}

/**
 * Validate configuration data structure
 * @param {Object} data - Configuration data to validate
 * @returns {Object} Validation result {valid: boolean, error: string}
 */
export function validateConfig(data) {
    if (!data || typeof data !== 'object') {
        return { valid: false, error: '无效的数据格式' };
    }

    if (!data.metadata) {
        return { valid: false, error: '缺少元数据 (metadata)' };
    }

    if (!data.materials || typeof data.materials !== 'object') {
        return { valid: false, error: '缺少或无效的材料库数据 (materials)' };
    }

    if (!data.formulas || typeof data.formulas !== 'object') {
        return { valid: false, error: '缺少或无效的配方数据 (formulas)' };
    }

    // Check version compatibility (future-proofing)
    if (data.metadata.version && data.metadata.version !== '1.0') {
        console.warn('⚠️ 数据版本不匹配，可能存在兼容性问题');
    }

    return { valid: true };
}

import { DataNormalizer } from './dataNormalizer.js';

/**
 * Merge imported config with existing config
 * @param {Object} existing - Existing configuration
 * @param {Object} imported - Imported configuration
 * @param {string} mode - 'merge' or 'replace'
 * @returns {Object} Merged configuration
 */
export function mergeConfig(existing, imported, mode = 'replace') {
    // Normalize imported materials immediately
    const normalizedImportedMaterials = DataNormalizer.normalizeMaterialCatalog(imported.materials);

    if (mode === 'replace') {
        return {
            materials: normalizedImportedMaterials,
            formulas: imported.formulas
        };
    }

    // Merge mode: keep existing, overwrite duplicates
    // Also re-normalize existing materials just to be safe
    const normalizedExistingMaterials = DataNormalizer.normalizeMaterialCatalog(existing.materials);

    return {
        materials: { ...normalizedExistingMaterials, ...normalizedImportedMaterials },
        formulas: { ...existing.formulas, ...imported.formulas }
    };
}

/**
 * Export materials catalog to CSV
 * @param {Object} materials - Materials catalog object
 * @returns {string} CSV content
 */
export function exportMaterialsCSV(materials) {
    const headers = ['材料ID', '类型', '型号', '供应商', '单位', '最小起订', '包装规格', '备注'];
    const rows = [headers];

    Object.entries(materials).forEach(([id, material]) => {
        rows.push([
            id,
            material.type || '',
            material.model || '',
            material.supplier || '',
            material.unit || '',
            material.minOrder || '',
            material.packageSpec || '',
            material.notes || ''
        ]);
    });

    return convertToCSV(rows);
}

/**
 * Export color formulas to CSV
 * @param {Object} formulas - Color formulas object
 * @returns {string} CSV content
 */
export function exportFormulasCSV(formulas) {
    const headers = ['颜色名称', '材料ID', '部位', '单门用量', '双开用量', '子母用量'];
    const rows = [headers];

    Object.entries(formulas).forEach(([colorName, formula]) => {
        if (formula.bom && Array.isArray(formula.bom)) {
            formula.bom.forEach(bomItem => {
                rows.push([
                    colorName,
                    bomItem.materialId || '',
                    bomItem.part || '',
                    bomItem.usage?.single || '',
                    bomItem.usage?.double || '',
                    bomItem.usage?.paired || ''
                ]);
            });
        }
    });

    return convertToCSV(rows);
}

/**
 * Convert array of rows to CSV string
 * @param {Array<Array>} rows - Array of rows
 * @returns {string} CSV string
 */
function convertToCSV(rows) {
    return rows.map(row => {
        return row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma or quote
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',');
    }).join('\n');
}

/**
 * Download CSV file with BOM for UTF-8 encoding
 * @param {string} csvContent - CSV content
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename) {
    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

/**
 * Export configuration to CSV files (materials and formulas separately)
 * @param {Object} materials - Materials catalog object
 * @param {Object} formulas - Color formulas object
 */
export function exportConfigCSV(materials, formulas) {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '')
        .replace(/\..+/, '')
        .replace('T', '_');

    // Export materials
    const materialsCSV = exportMaterialsCSV(materials);
    downloadCSV(materialsCSV, `原材料库_${timestamp}.csv`);

    // Small delay to avoid browser blocking multiple downloads
    setTimeout(() => {
        const formulasCSV = exportFormulasCSV(formulas);
        downloadCSV(formulasCSV, `颜色配方_${timestamp}.csv`);
    }, 100);

    console.log('✅ CSV 文件已导出');
}
