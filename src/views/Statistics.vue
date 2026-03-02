<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next'
</script>

<template>
  <div class="p-8 h-full flex flex-col items-center justify-center text-center">
    <div class="max-w-md w-full p-8 border-2 border-slate-200 rounded-xl bg-white shadow-sm flex flex-col items-center">
      <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
        <AlertCircle class="w-8 h-8" />
      </div>
      <h1 class="text-2xl font-semibold text-slate-900 mb-2">数据统计</h1>
      <p class="text-slate-500 mb-8">数据统计功能即将上线，包含订单数据分析、物料消耗统计、业绩报表等功能。</p>
      <router-link to="/" class="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium">
        返回控制台
      </router-link>
    </div>
  </div>
</template>
