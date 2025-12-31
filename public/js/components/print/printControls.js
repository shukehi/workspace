/**
 * 打印控制模块
 * 负责缩放控制功能
 */

/**
 * 初始化缩放控制
 * @param {HTMLElement} printOutput - 打印输出容器
 */
export function initZoomControls(printOutput) {
    const zoom50Btn = document.getElementById('zoom50');
    const zoom75Btn = document.getElementById('zoom75');
    const zoom100Btn = document.getElementById('zoom100');
    const zoom125Btn = document.getElementById('zoom125');

    if (zoom50Btn) {
        zoom50Btn.addEventListener('click', () => setZoom('zoom-50', printOutput));
    }
    if (zoom75Btn) {
        zoom75Btn.addEventListener('click', () => setZoom('zoom-75', printOutput));
    }
    if (zoom100Btn) {
        zoom100Btn.addEventListener('click', () => setZoom('zoom-100', printOutput));
    }
    if (zoom125Btn) {
        zoom125Btn.addEventListener('click', () => setZoom('zoom-125', printOutput));
    }

    function setZoom(zoomClass, printOutput) {
        // Remove all zoom classes
        printOutput.className = '';
        // Add selected zoom class
        printOutput.className = zoomClass;

        // Update active button state
        const allZoomBtns = [zoom50Btn, zoom75Btn, zoom100Btn, zoom125Btn];
        allZoomBtns.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        // Add active class to selected button
        const zoomBtnMap = {
            'zoom-50': zoom50Btn,
            'zoom-75': zoom75Btn,
            'zoom-100': zoom100Btn,
            'zoom-125': zoom125Btn
        };
        if (zoomBtnMap[zoomClass]) {
            zoomBtnMap[zoomClass].classList.add('active');
        }
    }
}
