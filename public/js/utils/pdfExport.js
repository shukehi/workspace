/**
 * PDF Export Utility
 * Converts purchase order HTML to PDF using html2pdf.js
 */

/**
 * Export purchase order to PDF
 * Renders each .print-page element separately to avoid flexbox rendering issues
 * @param {string} poNumber - Purchase order number
 * @param {HTMLElement} containerElement - Container with .print-page elements
 * @returns {Promise<void>}
 */
export async function exportPurchaseOrderToPDF(poNumber, containerElement) {
    // Check if html2pdf is loaded
    if (typeof html2pdf === 'undefined') {
        throw new Error('html2pdf.js library not loaded');
    }

    const filename = `${poNumber}.pdf`;

    // Extract all .print-page elements from the container
    const pages = containerElement.querySelectorAll('.print-page');

    if (pages.length === 0) {
        throw new Error('No print pages found in container');
    }

    console.log(`📄 Found ${pages.length} pages to export`);

    // Configure PDF options for A4 print layout
    const options = {
        margin: [10, 10, 10, 10], // [top, left, bottom, right] in mm
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: true,  // Enable logging for debugging
            allowTaint: true,
            removeContainer: true,
            backgroundColor: '#ffffff'
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    try {
        console.log(`📄 Generating PDF: ${filename}...`);

        // Process first page
        let worker = html2pdf().set(options).from(pages[0]);

        // Add remaining pages
        for (let i = 1; i < pages.length; i++) {
            worker = worker.toPdf().get('pdf').then((pdf) => {
                pdf.addPage();
                return pdf;
            }).from(pages[i]);
        }

        // Save the PDF
        await worker.save();

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
            letterRendering: true,
            logging: false,
            allowTaint: true,
            removeContainer: true,
            backgroundColor: '#ffffff',
            windowWidth: 1200,
            windowHeight: 1600
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
