<script setup lang="ts">
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-vue-next';
import { ref } from 'vue';
import Sidebar from './Sidebar.vue';

const open = ref(false);

function closeMenu() {
  open.value = false;
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
       <Button variant="ghost" size="icon" class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md">
          <Menu class="w-6 h-6" />
       </Button>
    </SheetTrigger>
    <SheetContent side="left" class="p-0 border-r border-border w-80 max-w-[88vw] rounded-none">
        <Sidebar class="w-full h-full border-none" @navigate="closeMenu" />
    </SheetContent>
  </Sheet>
</template>
