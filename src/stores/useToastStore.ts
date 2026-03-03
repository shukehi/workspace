import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Toast {
    id: number;
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
}

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([]);

    function toast(payload: Omit<Toast, 'id'>) {
        const id = Date.now();
        toasts.value.push({ ...payload, id });
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id);
        }, 3000);
    }

    function remove(id: number) {
        toasts.value = toasts.value.filter(t => t.id !== id);
    }

    return { toasts, toast, remove };
});
