<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Bell, CircleHelp, Search } from 'lucide-vue-next';
import Sidebar from './Sidebar.vue';
import MobileNav from './MobileNav.vue';
import Toaster from '@/components/ui/Toaster.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const route = useRoute();

const pageTitle = computed(() => String(route.meta.title || '工作台'));
const pageSection = computed(() => String(route.meta.section || 'ERP Workspace'));
</script>

<template>
  <div class="min-h-screen bg-muted text-foreground md:flex">
    <Toaster />

    <Sidebar class="hidden md:block w-64 flex-shrink-0 border-r border-border/80 bg-sidebar z-20" />

    <div class="flex min-h-screen min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div class="flex h-14 items-center gap-3 px-4 md:px-6">
          <div class="md:hidden flex items-center gap-2">
            <MobileNav />
            <div class="leading-tight">
              <div class="text-sm font-semibold">{{ pageTitle }}</div>
              <div class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Desk</div>
            </div>
          </div>

          <div class="hidden min-w-0 md:block">
            <div class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{{ pageSection }}</div>
            <div class="truncate text-base font-semibold leading-tight">{{ pageTitle }}</div>
          </div>

          <div class="mx-auto hidden w-full max-w-xl md:block">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="global-workspace-search"
                name="global-workspace-search"
                placeholder="搜索页面、合同、采购单或物料…"
                class="h-9 rounded-full border-border/70 bg-muted/70 pl-9 shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div class="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon-sm" class="rounded-full text-muted-foreground">
              <CircleHelp class="size-4" />
              <span class="sr-only">帮助</span>
            </Button>
            <Button variant="ghost" size="icon-sm" class="rounded-full text-muted-foreground">
              <Bell class="size-4" />
              <span class="sr-only">通知</span>
            </Button>
            <div class="hidden size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground md:flex">
              OS
            </div>
          </div>
        </div>
      </header>

      <main class="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>
