<script setup lang="ts">
import Sidebar from './Sidebar.vue';
import MobileNav from './MobileNav.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col md:flex-row">
    <!-- Desktop Sidebar -->
    <Sidebar class="hidden md:block w-64 flex-shrink-0 border-r border-slate-200 bg-white shadow-sm z-10" />

    <!-- Mobile Header -->
    <div class="md:hidden h-14 border-b border-slate-200 flex items-center px-4 justify-between bg-white text-slate-900 shadow-sm z-20 sticky top-0">
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
