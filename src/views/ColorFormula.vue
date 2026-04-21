<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import FormulaProfileHost from '@/features/formulas/components/FormulaProfileHost.vue';
import { useFormulaManager } from '@/features/formulas/composables/useFormulaManager';

const manager = reactive(useFormulaManager());

onMounted(() => {
  manager.initialize();
});
</script>

<template>
  <FormulaProfileHost :manager="manager" />
</template>
