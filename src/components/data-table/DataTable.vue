<script setup lang="ts" generic="TData, TValue">
import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/vue-table'
import type { ColumnDef, SortingState, ColumnFiltersState, VisibilityState } from '@tanstack/vue-table'
import { ref, watch, defineExpose } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const props = defineProps<{
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableSelection?: boolean
}>()

const emit = defineEmits<{
  (e: 'selection-change', rows: TData[]): void
}>()

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})

const table = useVueTable({
  get data() { return props.data },
  get columns() { return props.columns },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: (updaterOrValue) => valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: (updaterOrValue) => valueUpdater(updaterOrValue, rowSelection),
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
  },
})

// Watch selection and emit
watch(rowSelection, () => {
    const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
    emit('selection-change', selectedRows);
}, { deep: true });

function valueUpdater(updaterOrValue: any, ref: any) {
  ref.value = typeof updaterOrValue === 'function'
    ? updaterOrValue(ref.value)
    : updaterOrValue
}

defineExpose({
    getSelectedRows: () => table.getSelectedRowModel().rows.map(row => row.original),
    clearSelection: () => table.resetRowSelection()
});
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <div class="flex items-center py-4 shrink-0">
        <div class="relative w-full max-w-sm group">
            <Input 
                class="rounded-[0px] border-black border-2 font-mono placeholder:uppercase pl-10" 
                placeholder="快速筛选..." 
                :model-value="(table.getColumn('productModelName')?.getFilterValue() as string) ?? ''"
                @update:model-value="table.getColumn('productModelName')?.setFilterValue($event)"
            />
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-black/50 group-focus-within:text-black">
                🔍
            </div>
        </div>
        <div v-if="enableSelection" class="ml-4 text-sm font-mono uppercase bg-black text-white px-3 py-1 animate-in fade-in slide-in-from-left-2">
            Selected: {{ table.getFilteredSelectedRowModel().rows.length }} / {{ table.getFilteredRowModel().rows.length }}
        </div>
    </div>
    
    <div class="border-2 border-black flex-1 overflow-auto bg-white relative">
      <Table>
        <TableHeader class="bg-black text-white sticky top-0 z-10 shadow-md">
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="hover:bg-black border-b border-white/20">
            <!-- Selection Checkbox Head -->
            <TableHead v-if="enableSelection" class="w-12 text-center border-r border-white/20">
                <Checkbox 
                    class="border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                    :checked="table.getIsAllPageRowsSelected()"
                    @update:checked="(value: boolean | string) => table.toggleAllPageRowsSelected(!!value)"
                />
            </TableHead>

            <TableHead v-for="header in headerGroup.headers" :key="header.id" class="text-white font-mono uppercase tracking-wider h-12 border-r border-white/20 last:border-r-0">
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
              class="border-b border-black hover:bg-neutral-50 data-[state=selected]:bg-yellow-50/50 transition-colors"
            >
              <!-- Selection Checkbox Cell -->
              <TableCell v-if="enableSelection" class="w-12 text-center border-r border-black/10">
                <Checkbox 
                    class="border-black"
                    :checked="row.getIsSelected()"
                    @update:checked="(value: boolean | string) => row.toggleSelected(!!value)"
                />
              </TableCell>

              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="border-r border-black/10 last:border-r-0 font-mono py-2 text-xs">
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow>
              <TableCell :colspan="columns.length + (enableSelection ? 1 : 0)" class="h-32 text-center font-mono uppercase text-slate-400">
                No results found.
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <div class="flex items-center justify-between py-4 shrink-0">
      <div class="text-xs font-mono text-slate-500 uppercase">
        Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }}
      </div>
      <div class="flex items-center space-x-2">
        <Button
            variant="outline"
            size="sm"
            :disabled="!table.getCanPreviousPage()"
            @click="table.previousPage()"
            class="border-2 border-black rounded-[0px] font-mono uppercase font-bold hover:bg-black hover:text-white disabled:opacity-30"
        >
            Prev
        </Button>
        <Button
            variant="outline"
            size="sm"
            :disabled="!table.getCanNextPage()"
            @click="table.nextPage()"
            class="border-2 border-black rounded-[0px] font-mono uppercase font-bold hover:bg-black hover:text-white disabled:opacity-30"
        >
            Next
        </Button>
      </div>
    </div>
  </div>
</template>
