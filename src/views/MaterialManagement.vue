<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DataTable from '@/components/common/DataTable.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { Search, Plus, Edit2 } from 'lucide-vue-next';

interface Material {
    id: number;
    code: string;
    name: string;
    model: string;
    supplier: string;
    unit: string;
    price: number;
    category: string;
}

const materials = ref<Material[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const isEditDialogOpen = ref(false);
const editingMaterial = ref<Partial<Material>>({});

// Columns configuration
const columns = [
    { accessorKey: 'code', header: '编码 (Code)' },
    { accessorKey: 'name', header: '名称 (Name)' },
    { accessorKey: 'model', header: '型号 (Model)' },
    { accessorKey: 'category', header: '分类 (Category)' },
    { accessorKey: 'supplier', header: '供应商 (Supplier)' },
    { accessorKey: 'price', header: '单价 (Price)', cell: ({ row }: any) => `¥${row.original.price}` },
    { 
        id: 'actions',
        cell: ({ row }: any) => {
             return null; // Custom logic handled in template for now if complex, but DataTable supports better ways
             // For simplicity, we assume DataTable emits row-click or similar, 
             // or we rely on a wrapper. 
             // Actually, let's use the DataTable's slot feature if available, 
             // or just a simple table implementation if DataTable is too generic.
        }
    }
];

// Re-fetch
const fetchMaterials = async () => {
    loading.value = true;
    try {
        const res = await axios.get('/api/materials', {
            params: { q: searchQuery.value }
        });
        materials.value = res.data;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const handleEdit = (material: Material) => {
    editingMaterial.value = { ...material };
    isEditDialogOpen.value = true;
};

const handleSave = async () => {
    try {
        if (editingMaterial.value.id) {
            await axios.put(`/api/materials/${editingMaterial.value.id}`, editingMaterial.value);
        } else {
            await axios.post('/api/materials', editingMaterial.value);
        }
        isEditDialogOpen.value = false;
        fetchMaterials();
    } catch (e) {
        console.error(e);
    }
};

onMounted(fetchMaterials);
</script>

<template>
    <div class="h-full flex flex-col space-y-4 p-4">
        <!-- Header -->
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-3xl font-semibold text-slate-900">物料管理</h2>
                <p class="text-slate-500 mt-1">维护系统基础物料信息、价格与供应商</p>
            </div>
            <Button @click="() => { editingMaterial = {}; isEditDialogOpen = true; }">
                <Plus class="mr-2 h-4 w-4" /> 新增物料
            </Button>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center space-x-2">
            <div class="relative w-full max-w-sm">
                <Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input v-model="searchQuery" placeholder="搜索物料编码、名称..." class="pl-8" @keyup.enter="fetchMaterials" />
            </div>
             <Button variant="secondary" @click="fetchMaterials">搜索</Button>
        </div>

        <!-- Table Area -->
        <div class="rounded-xl border border-slate-200 shadow-sm bg-white p-4 flex-1 overflow-auto">
             <table class="w-full text-sm text-left">
                <thead class="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 rounded-t-lg">
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
                    <tr v-for="mat in materials" :key="mat.id" class="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-4 font-medium text-slate-900">{{ mat.code }}</td>
                        <td class="px-6 py-4 text-slate-600">{{ mat.name }}</td>
                        <td class="px-6 py-4 text-slate-600">{{ mat.model }}</td>
                        <td class="px-6 py-4 text-slate-600">{{ mat.category }}</td>
                         <td class="px-6 py-4 text-slate-600">{{ mat.supplier }}</td>
                        <td class="px-6 py-4 text-emerald-600 font-semibold">¥{{ mat.price }}</td>
                         <td class="px-6 py-4">
                            <Button variant="ghost" size="sm" @click="handleEdit(mat)" class="text-slate-400 hover:text-slate-900">
                                <Edit2 class="h-4 w-4" />
                            </Button>
                        </td>
                    </tr>
                </tbody>
             </table>
             <div v-if="materials.length === 0 && !loading" class="p-8 text-center text-muted-foreground">
                暂无数据
             </div>
        </div>

        <!-- Edit Dialog -->
        <Dialog :open="isEditDialogOpen" @update:open="isEditDialogOpen = $event">
            <DialogContent class="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{{ editingMaterial.id ? '编辑物料' : '新增物料' }}</DialogTitle>
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
                    <Button type="submit" @click="handleSave">保存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
