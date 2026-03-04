<script setup lang="ts">
import Sidebar from './Sidebar.vue';
import MobileNav from './MobileNav.vue';
import Toaster from '@/components/ui/Toaster.vue';
</script>

<template>
  <div class="min-h-screen bg-muted/20 flex flex-col md:flex-row">
    <!-- Toasts -->
    <Toaster />

    <!-- Desktop Sidebar -->
    <Sidebar class="hidden md:block w-64 flex-shrink-0 border-r border-border bg-background  z-10" />

    <!-- Mobile Header -->
    <div class="md:hidden h-14 border-b border-border flex items-center px-4 justify-between bg-background text-foreground  z-20 sticky top-0">
        <span class="font-semibold">System V2</span>
        <MobileNav />
    </div>

    <!-- Main Content -->
    <main class="flex-1 w-full p-0 overflow-y-auto overflow-x-hidden relative">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>
