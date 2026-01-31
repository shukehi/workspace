/**
 * Preview Modal Component
 * Full-screen modal for previewing purchase orders
 */

const { ref, onMounted, onUnmounted } = Vue;

export const PreviewModal = {
    template: '#preview-modal-template',
    props: {
        show: {
            type: Boolean,
            default: false
        },
        previewUrl: {
            type: String,
            default: ''
        }
    },
    emits: ['close'],
    setup(props, { emit }) {
        const iframeRef = ref(null);

        const closeModal = () => {
            emit('close');
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape' && props.show) {
                closeModal();
            }
        };

        const handleOverlayClick = (e) => {
            // Only close if clicking the overlay itself, not the content
            if (e.target.classList.contains('preview-modal-overlay')) {
                closeModal();
            }
        };

        // Edit: Toggle edit mode in iframe
        const handleEdit = () => {
            if (iframeRef.value?.contentWindow) {
                iframeRef.value.contentWindow.postMessage({ action: 'TOGGLE_EDIT' }, '*');
            }
        };

        // Print: Trigger print dialog
        const handlePrint = () => {
            if (iframeRef.value?.contentWindow) {
                iframeRef.value.contentWindow.print();
            }
        };

        // Export: Trigger PDF export in iframe
        const handleExport = () => {
            if (iframeRef.value?.contentWindow) {
                iframeRef.value.contentWindow.postMessage({ action: 'EXPORT_PDF' }, '*');
            }
        };

        onMounted(() => {
            document.addEventListener('keydown', handleEscape);
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleEscape);
        });

        return {
            iframeRef,
            closeModal,
            handleOverlayClick,
            handleEdit,
            handlePrint,
            handleExport
        };
    }
};
