<script setup lang="ts">
import Sidebar from './Sidebar.vue';
import MobileNav from './MobileNav.vue';
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col md:flex-row">
    <!-- Desktop Sidebar -->
    <Sidebar class="hidden md:block w-64 flex-shrink-0 border-r-2 border-black" />

    <!-- Mobile Header -->
    <div class="md:hidden h-14 border-b-2 border-black flex items-center px-4 justify-between bg-black text-white">
        <span class="font-mono font-bold uppercase">System V2</span>
        <MobileNav />
    </div>

    <!-- Main Content -->
    <main class="flex-1 w-full p-0 overflow-y-auto">
       <slot />
    </main>
  </div>
</template>
