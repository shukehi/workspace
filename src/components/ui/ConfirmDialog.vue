<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Trash2, HelpCircle, Loader2 } from 'lucide-vue-next';
import { computed } from 'vue';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'question';
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  variant: 'info',
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const iconComponent = computed(() => {
  switch (props.variant) {
    case 'danger': return Trash2;
    case 'warning': return AlertTriangle;
    case 'question': return HelpCircle;
    default: return Info;
  }
});

const iconClass = computed(() => {
  switch (props.variant) {
    case 'danger': return 'text-destructive bg-destructive/10 ring-destructive/20';
    case 'warning': return 'text-amber-600 bg-amber-50 ring-amber-100';
    case 'question': return 'text-blue-600 bg-blue-50 ring-blue-100';
    default: return 'text-primary bg-primary/10 ring-primary/20';
  }
});

const confirmButtonVariant = computed(() => {
  return props.variant === 'danger' ? 'destructive' : 'default';
});

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('update:open', false);
  emit('cancel');
};
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-[400px] p-0 overflow-hidden border-none shadow-2xl scale-95 data-[state=open]:scale-100 transition-transform duration-200">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div :class="['p-3 rounded-full ring-4 shrink-0', iconClass]">
            <component :is="iconComponent" class="w-6 h-6" />
          </div>
          <div class="flex-1 pt-1">
            <DialogHeader>
              <DialogTitle class="text-xl font-bold tracking-tight">{{ title }}</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-2 leading-relaxed">
                <slot>
                  {{ message }}
                </slot>
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>
      </div>
      
      <DialogFooter class="bg-muted/30 p-4 border-t flex flex-row justify-end gap-2">
        <Button variant="ghost" @click="handleCancel" :disabled="loading" class="px-6 font-medium">
          {{ cancelText }}
        </Button>
        <Button :variant="confirmButtonVariant" @click="handleConfirm" :disabled="loading" class="px-6 font-semibold shadow-sm">
          <Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
          {{ confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
