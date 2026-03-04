<script setup lang="ts">
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-vue-next';
import Sidebar from './Sidebar.vue';
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
       <Button variant="ghost" size="icon" class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg">
          <Menu class="w-6 h-6" />
       </Button>
    </SheetTrigger>
    <SheetContent side="left" class="p-0 border-r border-border w-72 rounded-lg">
        <Sidebar class="w-full h-full border-none" />
    </SheetContent>
  </Sheet>
</template>
