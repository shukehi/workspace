<script setup lang="ts">
import { cn } from '@/lib/utils';
import { mainNav } from '@/config/nav';
console.log('Sidebar loaded, nav items:', mainNav);
</script>

<template>
  <div class="h-full bg-white flex flex-col">
    <div class="h-14 flex items-center px-6 border-b border-slate-100 bg-white text-slate-900">
        <span class="font-bold tracking-wider">Order System</span>
    </div>
    <nav class="flex-1 py-4 flex flex-col space-y-1 px-3">
        <!-- Navigation Items -->
        <router-link 
            v-for="item in mainNav" 
            :key="item.href"
            :to="item.href" 
            class="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-sm block transition-colors group flex items-center"
            active-class="bg-slate-100 text-slate-900 font-medium"
        >
            <span class="text-slate-400 mr-2 group-hover:text-slate-500">[{{ item.number }}]</span> {{ item.title }}
        </router-link>
    </nav>
    <div class="p-4 border-t border-slate-100 text-xs text-slate-400">
        Ver 2.0.0
    </div>
  </div>
</template>
