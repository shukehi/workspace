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

function setDefaultOpenState(_activeGroupId: GroupId | null) {
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
      setDefaultOpenState(groupId);
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
  <div class="h-full bg-background flex flex-col">
    <div class="h-16 flex items-center px-5 border-b border-border bg-background/95">
      <div class="leading-tight">
        <div class="text-sm font-semibold tracking-wide">Order System</div>
        <div class="text-[11px] text-muted-foreground">Operations Console</div>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-3">
      <section v-for="group in mainNavGroups" :key="group.id" class="space-y-1">
        <button
          type="button"
          class="menu-group-trigger"
          :aria-expanded="isGroupOpen(group.id)"
          :aria-controls="`menu-group-${group.id}`"
          @click="toggleGroup(group.id)"
        >
          <span class="menu-group-title">{{ group.title }}</span>
          <ChevronDown class="h-4 w-4 transition-transform duration-150" :class="isGroupOpen(group.id) ? 'rotate-180' : ''" />
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

    <div class="px-4 py-3 border-t border-border text-[11px] text-muted-foreground/80">
      Ver 2.0.0
    </div>
  </div>
</template>
