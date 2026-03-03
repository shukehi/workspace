<script setup lang="ts">
import { useToastStore } from '@/stores/useToastStore';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-vue-next';

const store = useToastStore();

const variants = {
    default: 'bg-slate-900 text-white border-slate-800',
    success: 'bg-emerald-600 text-white border-emerald-500',
    destructive: 'bg-rose-600 text-white border-rose-500'
};
</script>

<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[320px]">
    <transition-group 
        enter-active-class="transition duration-300 ease-out transform"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-200 ease-in transform"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
    >
        <div 
            v-for="toast in store.toasts" 
            :key="toast.id"
            class="px-4 py-3 rounded-lg border shadow-lg flex items-start gap-3 pointer-events-auto group relative"
            :class="variants[toast.variant || 'default']"
        >
            <div class="shrink-0 mt-0.5">
                <CheckCircle2 v-if="toast.variant === 'success'" class="w-4 h-4" />
                <AlertCircle v-else-if="toast.variant === 'destructive'" class="w-4 h-4" />
                <Info v-else class="w-4 h-4" />
            </div>
            
            <div class="flex-1">
                <div class="text-xs font-black uppercase tracking-widest leading-none mb-1">{{ toast.title }}</div>
                <div v-if="toast.description" class="text-xs opacity-80 leading-relaxed">{{ toast.description }}</div>
            </div>

            <button @click="store.remove(toast.id)" class="text-white/50 hover:text-white transition-colors">
                <X class="w-4 h-4" />
            </button>
        </div>
    </transition-group>
  </div>
</template>
