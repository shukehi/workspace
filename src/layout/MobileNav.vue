<script setup lang="ts">
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-vue-next';
import Sidebar from './Sidebar.vue';
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
       <Button variant="ghost" size="icon" class="text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-lg">
          <Menu class="w-6 h-6" />
       </Button>
    </SheetTrigger>
    <SheetContent side="left" class="p-0 border-r border-slate-200 w-72 rounded-none">
        <Sidebar class="w-full h-full border-none" />
    </SheetContent>
  </Sheet>
</template>
