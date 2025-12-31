/**
 * PDF Export Utility
 * Converts purchase order HTML to PDF using html2pdf.js
 */

/**
 * Export purchase order to PDF
 * @param {string} poNumber - Purchase order number
 * @param {HTMLElement} element - DOM element to convert
 * @returns {Promise<void>}
 */
export async function exportPurchaseOrderToPDF(poNumber, element) {
    // Check if html2pdf is loaded
    if (typeof html2pdf === 'undefined') {
        throw new Error('html2pdf.js library not loaded');
    }

    const filename = `${poNumber}.pdf`;

    // Configure PDF options for A4 print layout
    const options = {
        margin: [10, 10, 10, 10], // [top, left, bottom, right] in mm
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.print-page' // Each .print-page starts a new page
        }
    };

    try {
        console.log(`📄 Generating PDF: ${filename}...`);
        await html2pdf().set(options).from(element).save();
        console.log(`✅ PDF exported successfully: ${filename}`);
    } catch (error) {
        console.error('❌ PDF export failed:', error);
        throw new Error('PDF 导出失败，请重试');
    }
}

/**
 * Generate PDF blob (for preview or upload)
 * @param {string} poNumber - Purchase order number
 * @param {HTMLElement} element - DOM element to convert
 * @returns {Promise<Blob>} PDF blob
 */
export async function generatePDFBlob(poNumber, element) {
    if (typeof html2pdf === 'undefined') {
        throw new Error('html2pdf.js library not loaded');
    }

    const options = {
        margin: [10, 10, 10, 10],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        },
        pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.print-page'
        }
    };

    try {
        const pdf = await html2pdf().set(options).from(element).outputPdf('blob');
        return pdf;
    } catch (error) {
        console.error('❌ PDF generation failed:', error);
        throw new Error('PDF 生成失败');
    }
}
