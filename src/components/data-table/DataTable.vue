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
import { computed, ref, watch, defineExpose } from 'vue'
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
import { Search } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableSelection?: boolean
  searchColumnId?: string
  density?: 'comfortable' | 'compact'
  toolbar?: boolean
}>(), {
  enableSelection: false,
  density: 'comfortable',
  toolbar: true,
})

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

const activeSearchColumnId = computed(() => {
  if (props.searchColumnId && table.getColumn(props.searchColumnId)) {
    return props.searchColumnId
  }

  const fallback = table
    .getAllLeafColumns()
    .find((col) => col.id !== 'actions')?.id

  return fallback || ''
})

const activeSearchColumn = computed(() => {
  if (!activeSearchColumnId.value) return null
  return table.getColumn(activeSearchColumnId.value) || null
})

const cellPaddingClass = computed(() => props.density === 'compact' ? 'py-2' : 'py-3')

watch(rowSelection, () => {
  const selectedRows = table.getSelectedRowModel().rows.map(row => row.original)
  emit('selection-change', selectedRows)
}, { deep: true })

function valueUpdater(updaterOrValue: any, ref: any) {
  ref.value = typeof updaterOrValue === 'function'
    ? updaterOrValue(ref.value)
    : updaterOrValue
}

defineExpose({
  getSelectedRows: () => table.getSelectedRowModel().rows.map(row => row.original),
  clearSelection: () => table.resetRowSelection()
})
</script>

<template>
  <div class="w-full h-full flex flex-col gap-4">
    <div v-if="toolbar" class="flex items-center gap-3 shrink-0">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          class="pl-9"
          placeholder="快速筛选..."
          :model-value="(activeSearchColumn?.getFilterValue() as string) ?? ''"
          @update:model-value="activeSearchColumn?.setFilterValue($event)"
        />
      </div>
      <div v-if="enableSelection" class="ml-auto text-xs text-muted-foreground">
        已选 {{ table.getFilteredSelectedRowModel().rows.length }} / {{ table.getFilteredRowModel().rows.length }}
      </div>
    </div>

    <div class="flex-1 overflow-auto rounded-lg border bg-card">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/20">
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="hover:bg-transparent">
            <TableHead v-if="enableSelection" class="w-12 text-center">
              <Checkbox
                :checked="table.getIsAllPageRowsSelected()"
                @update:checked="(value: boolean | string) => table.toggleAllPageRowsSelected(!!value)"
              />
            </TableHead>

            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="text-foreground/80"
            >
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
              class="data-[state=selected]:bg-muted/60"
            >
              <TableCell v-if="enableSelection" class="w-12 text-center">
                <Checkbox
                  :checked="row.getIsSelected()"
                  @update:checked="(value: boolean | string) => row.toggleSelected(!!value)"
                />
              </TableCell>

              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="text-sm"
                :class="cellPaddingClass"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow>
              <TableCell :colspan="columns.length + (enableSelection ? 1 : 0)" class="h-32 text-center text-muted-foreground">
                No results found.
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <div class="flex items-center justify-between shrink-0">
      <div class="text-xs text-muted-foreground">
        Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }}
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="!table.getCanPreviousPage()"
          @click="table.previousPage()"
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="!table.getCanNextPage()"
          @click="table.nextPage()"
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</template>
