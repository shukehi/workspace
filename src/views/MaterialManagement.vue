<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Edit2 } from 'lucide-vue-next';
import { useMaterialManagementPageState } from '@/features/materials/composables/useMaterialManagementPageState';

const {
  materials,
  loading,
  searchQuery,
  isEditDialogOpen,
  editingMaterial,
  dialogTitle,
  fetchMaterials,
  openCreateDialog,
  openEditDialog,
  saveMaterial,
} = useMaterialManagementPageState();
</script>

<template>
  <div class="h-full flex flex-col gap-6 p-6 md:p-8 bg-muted/20">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">物料管理</h2>
        <p class="text-muted-foreground mt-1">维护系统基础物料信息、价格与供应商。</p>
      </div>
      <Button @click="openCreateDialog">
        <Plus class="mr-2 h-4 w-4" /> 新增物料
      </Button>
    </div>

    <Card>
      <CardContent class="p-4 flex items-center gap-2">
        <div class="relative w-full max-w-sm">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input v-model="searchQuery" placeholder="搜索物料编码、名称..." class="pl-8" @keyup.enter="fetchMaterials" />
        </div>
        <Button variant="outline" @click="fetchMaterials">搜索</Button>
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardContent class="p-0 h-full overflow-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-muted-foreground bg-muted/50 sticky top-0">
            <tr>
              <th class="px-6 py-3">编码</th>
              <th class="px-6 py-3">名称</th>
              <th class="px-6 py-3">型号</th>
              <th class="px-6 py-3">分类</th>
              <th class="px-6 py-3">供应商</th>
              <th class="px-6 py-3">单价</th>
              <th class="px-6 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mat in materials" :key="mat.id" class="bg-background border-b hover:bg-muted/40 transition-colors">
              <td class="px-6 py-4 font-medium">{{ mat.code }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.name }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.model }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.category }}</td>
              <td class="px-6 py-4 text-muted-foreground">{{ mat.supplier }}</td>
              <td class="px-6 py-4 text-emerald-600 font-semibold">¥{{ mat.price }}</td>
              <td class="px-6 py-4">
                <Button variant="ghost" size="sm" @click="openEditDialog(mat)">
                  <Edit2 class="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="materials.length === 0 && !loading" class="p-8 text-center text-muted-foreground">
          暂无数据
        </div>
      </CardContent>
    </Card>

    <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ dialogTitle }}</DialogTitle>
          <DialogDescription>
            请完善物料的基础信息。
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="code" class="text-right">编码</Label>
            <Input id="code" v-model="editingMaterial.code" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="name" class="text-right">名称</Label>
            <Input id="name" v-model="editingMaterial.name" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="model" class="text-right">型号</Label>
            <Input id="model" v-model="editingMaterial.model" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="supplier" class="text-right">供应商</Label>
            <Input id="supplier" v-model="editingMaterial.supplier" class="col-span-3" />
          </div>
          <div class="grid grid-cols-4 items-center gap-4">
            <Label for="price" class="text-right">单价</Label>
            <Input id="price" type="number" v-model="editingMaterial.price" class="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" @click="saveMaterial">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
