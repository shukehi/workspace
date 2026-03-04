<script setup lang="ts">
import { mainNav } from '@/config/nav';
</script>

<template>
  <div class="h-full bg-background flex flex-col">
    <div class="h-14 flex items-center px-6 border-b border-border bg-background text-foreground">
        <span class="font-bold tracking-wider">Order System</span>
    </div>
    <nav class="flex-1 py-4 flex flex-col space-y-1 px-3">
        <!-- Navigation Items -->
        <router-link 
            v-for="item in mainNav" 
            :key="item.href"
            :to="item.href" 
            class="px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/20 hover:text-foreground text-sm block transition-colors group flex items-center"
            active-class="bg-muted text-foreground font-medium"
        >
            <span class="text-muted-foreground mr-2 group-hover:text-muted-foreground">[{{ item.number }}]</span> {{ item.title }}
        </router-link>
    </nav>
    <div class="p-4 border-t border-border text-xs text-muted-foreground">
        Ver 2.0.0
    </div>
  </div>
</template>
