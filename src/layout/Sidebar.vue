<script setup lang="ts">
import { cn } from '@/lib/utils';
</script>

<template>
  <div class="h-full bg-neutral-50 flex flex-col">
    <div class="h-14 flex items-center px-6 border-b-2 border-black bg-black text-white">
        <span class="font-mono font-bold uppercase tracking-wider">Order System</span>
    </div>
    <nav class="flex-1 py-4 flex flex-col space-y-0">
        <!-- Navigation Items (Mock) -->
        <a href="#" class="px-6 py-3 border-b border-black hover:bg-black hover:text-white font-mono uppercase text-sm block transition-colors group">
            <span class="text-neutral-400 mr-2 group-hover:text-neutral-300">[01]</span> Dashboard
        </a>
        <a href="#" class="px-6 py-3 border-b border-black hover:bg-black hover:text-white font-mono uppercase text-sm block transition-colors group">
             <span class="text-neutral-400 mr-2 group-hover:text-neutral-300">[02]</span> Procurement
        </a>
        <a href="#" class="px-6 py-3 border-b border-black hover:bg-black hover:text-white font-mono uppercase text-sm block transition-colors group">
             <span class="text-neutral-400 mr-2 group-hover:text-neutral-300">[03]</span> Inventory
        </a>
    </nav>
    <div class="p-4 border-t-2 border-black font-mono text-xs text-neutral-500 uppercase">
        Ver 2.0.0
    </div>
  </div>
</template>
