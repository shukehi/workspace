<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue';
import { useRoute } from 'vue-router';
import {
  Archive,
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  Database,
  FlaskConical,
  Key,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wrench,
  Warehouse
} from 'lucide-vue-next';
import { mainNavGroups, type NavGroup, type NavIconKey } from '@/config/nav';
import { Separator } from '@/components/ui/separator';

const route = useRoute();
const emit = defineEmits<{
  navigate: [];
}>();
type GroupId = NavGroup['id'];
const openGroups = ref<Partial<Record<GroupId, boolean>>>({});

const iconMap: Record<NavIconKey, Component> = {
  dashboard: LayoutDashboard,
  source: Database,
  materials: Boxes,
  procurement: ShoppingCart,
  inventory: Warehouse,
  'material-master': ClipboardList,
  'supplier-master': ClipboardList,
  'master-data-diagnostics': ClipboardList,
  'master-data-governance': BarChart3,
  'material-catalog': Boxes,
  formula: FlaskConical,
  'packaging-config': Package,
  'cylinder-config': Key,
  'lock-config': Key,
  'handle-config': Wrench,
  'lock-fork-config': Wrench,
  statistics: BarChart3,
  'contracts-history': Archive
};

const groupEyebrow: Record<GroupId, string> = {
  workflow: 'MY WORKSPACES',
  config: 'PUBLIC',
  reports: 'REPORTS'
};

function resolveIcon(icon: NavIconKey): Component {
  return iconMap[icon] || LayoutDashboard;
}

function isRouteMatch(targetHref: string, currentPath: string): boolean {
  if (targetHref === '/') return currentPath === '/';
  return currentPath === targetHref || currentPath.startsWith(`${targetHref}/`);
}

function findGroupByPath(path: string): GroupId | null {
  for (const group of mainNavGroups) {
    if (group.items.some((item) => isRouteMatch(item.href, path))) {
      return group.id;
    }
  }
  return null;
}

function setDefaultOpenState() {
  const next: Partial<Record<GroupId, boolean>> = {};
  for (const group of mainNavGroups) {
    next[group.id] = true;
  }
  openGroups.value = next;
}

function isGroupOpen(groupId: GroupId): boolean {
  return Boolean(openGroups.value[groupId]);
}

function toggleGroup(groupId: GroupId) {
  openGroups.value = {
    ...openGroups.value,
    [groupId]: !isGroupOpen(groupId)
  };
}

function isItemActive(href: string): boolean {
  return isRouteMatch(href, route.path);
}

function handleNavigate(navigate: () => void) {
  navigate();
  emit('navigate');
}

const activeGroupId = computed(() => findGroupByPath(route.path));

watch(
  activeGroupId,
  (groupId) => {
    if (Object.keys(openGroups.value).length === 0) {
      setDefaultOpenState();
      return;
    }

    if (groupId && !isGroupOpen(groupId)) {
      openGroups.value = {
        ...openGroups.value,
        [groupId]: true
      };
    }
  },
  { immediate: true }
);
</script>

<template>
  <aside class="flex h-full flex-col bg-sidebar text-sidebar-foreground">
    <div class="flex h-14 items-center gap-3 px-4">
      <div class="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
        OS
      </div>
      <div class="min-w-0 leading-tight">
        <div class="truncate text-sm font-semibold">Order System</div>
        <div class="truncate text-[11px] text-muted-foreground">Frappe-style operations desk</div>
      </div>
    </div>

    <div class="px-3">
      <div class="rounded-xl border border-border/70 bg-background/70 px-3 py-2 shadow-xs">
        <div class="text-[11px] font-medium text-muted-foreground">当前站点</div>
        <div class="mt-0.5 truncate text-sm font-semibold">采购与库存控制台</div>
      </div>
    </div>

    <Separator class="my-3 bg-border/70" />

    <nav class="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
      <section v-for="group in mainNavGroups" :key="group.id" class="flex flex-col gap-1.5">
        <button
          type="button"
          class="menu-group-trigger"
          :aria-expanded="isGroupOpen(group.id)"
          :aria-controls="`menu-group-${group.id}`"
          @click="toggleGroup(group.id)"
        >
          <span class="flex min-w-0 flex-col items-start leading-tight">
            <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">{{ groupEyebrow[group.id] }}</span>
            <span class="menu-group-title">{{ group.title }}</span>
          </span>
          <ChevronDown class="size-4 shrink-0 transition-transform duration-150" :class="isGroupOpen(group.id) ? 'rotate-180' : ''" />
        </button>

        <transition name="menu-collapse">
          <div
            v-show="isGroupOpen(group.id)"
            :id="`menu-group-${group.id}`"
            class="menu-group-panel"
            :aria-hidden="!isGroupOpen(group.id)"
          >
            <div class="menu-group-panel-inner">
              <router-link
                v-for="item in group.items"
                :key="item.href"
                :to="item.href"
                custom
                v-slot="{ href, navigate }"
              >
                <a
                  :href="href"
                  class="menu-item"
                  :class="isItemActive(item.href) ? 'menu-item-active' : ''"
                  :aria-current="isItemActive(item.href) ? 'page' : undefined"
                  @click="handleNavigate(navigate)"
                >
                  <component :is="resolveIcon(item.icon)" class="menu-item-icon" />
                  <span class="truncate">{{ item.title }}</span>
                </a>
              </router-link>
            </div>
          </div>
        </transition>
      </section>
    </nav>

    <div class="border-t border-border/70 px-4 py-3">
      <div class="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Order Desk</span>
        <span>v2.0.0</span>
      </div>
    </div>
  </aside>
</template>
