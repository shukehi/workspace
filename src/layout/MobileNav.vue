<script setup lang="ts">
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-vue-next';
import Sidebar from './Sidebar.vue';
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
       <Button variant="ghost" size="icon" class="text-white hover:bg-white hover:text-black rounded-[0px]">
          <Menu class="w-6 h-6" />
       </Button>
    </SheetTrigger>
    <SheetContent side="left" class="p-0 border-r-2 border-black w-72 rounded-[0px]">
        <Sidebar class="w-full h-full border-none" />
    </SheetContent>
  </Sheet>
</template>
