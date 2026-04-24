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
import Skeleton from '@/components/ui/Skeleton.vue'

const props = withDefaults(defineProps<{
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableSelection?: boolean
  searchColumnId?: string
  searchPlaceholder?: string
  density?: 'comfortable' | 'compact'
  toolbar?: boolean
  useColumnSize?: boolean
  emptyText?: string
  loading?: boolean
  prevLabel?: string
  nextLabel?: string
  pageLabelPrefix?: string
  pageLabelConnector?: string
  tableMinWidth?: number
  manualPagination?: boolean
  page?: number
  pageSize?: number
  total?: number
  pageSizeOptions?: number[]
}>(), {
  enableSelection: false,
  searchPlaceholder: '快速筛选...',
  density: 'comfortable',
  toolbar: true,
  useColumnSize: false,
  emptyText: '暂无数据',
  loading: false,
  prevLabel: '上一页',
  nextLabel: '下一页',
  pageLabelPrefix: '第',
  pageLabelConnector: '/',
  tableMinWidth: 0,
  manualPagination: false,
  page: 1,
  pageSize: 50,
  total: 0,
  pageSizeOptions: () => [],
})

const emit = defineEmits<{
  (e: 'selection-change', rows: TData[]): void
  (e: 'page-change', page: number): void
  (e: 'page-size-change', pageSize: number): void
  (e: 'row-click', row: TData): void
}>()

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref<Record<string, boolean>>({})
const pagination = ref({
  pageIndex: 0,
  pageSize: 50,
})

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
  onPaginationChange: (updaterOrValue) => valueUpdater(updaterOrValue, pagination),
  enableRowSelection: true,
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
    get pagination() { return pagination.value },
  },
  getRowId: (row: any, index: number) => {
    if (row?.id !== undefined && row?.id !== null && String(row.id) !== '') {
      return String(row.id)
    }
    if (row?.order_no !== undefined && row?.order_no !== null && String(row.order_no) !== '') {
      return String(row.order_no)
    }
    return `row-${index}`
  },
})

watch(
  () => [props.page, props.pageSize, props.manualPagination] as const,
  ([, pageSize, manualPagination]) => {
    if (!manualPagination) return;
    pagination.value = {
      pageIndex: 0,
      pageSize: Math.max(1, pageSize || 50),
    }
  },
  { immediate: true }
)

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

watch(
  () => [props.manualPagination, props.page, props.data] as const,
  ([manualPagination]) => {
    if (!manualPagination) return
    table.resetRowSelection()
    emit('selection-change', [])
  }
)

function valueUpdater(updaterOrValue: any, ref: any) {
  ref.value = typeof updaterOrValue === 'function'
    ? updaterOrValue(ref.value)
    : updaterOrValue
}

defineExpose({
  getSelectedRows: () => table.getSelectedRowModel().rows.map(row => row.original),
  clearSelection: () => table.resetRowSelection()
})

const displayPageCount = computed(() => {
  if (!props.manualPagination) return table.getPageCount()
  return Math.max(1, Math.ceil((props.total || 0) / Math.max(1, props.pageSize || 50)))
})

const displayPageIndex = computed(() => {
  if (!props.manualPagination) return table.getState().pagination.pageIndex + 1
  return Math.max(1, props.page || 1)
})

const canPreviousPage = computed(() => {
  if (!props.manualPagination) return table.getCanPreviousPage()
  return displayPageIndex.value > 1
})

const canNextPage = computed(() => {
  if (!props.manualPagination) return table.getCanNextPage()
  return displayPageIndex.value < displayPageCount.value
})

function goToPreviousPage() {
  if (props.manualPagination) {
    if (!canPreviousPage.value) return
    emit('page-change', displayPageIndex.value - 1)
    return
  }
  table.previousPage()
}

function goToNextPage() {
  if (props.manualPagination) {
    if (!canNextPage.value) return
    emit('page-change', displayPageIndex.value + 1)
    return
  }
  table.nextPage()
}
</script>

<template>
  <div class="w-full h-full flex flex-col gap-4">
    <div v-if="toolbar" class="flex items-center gap-3 shrink-0">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          class="pl-9"
          :placeholder="searchPlaceholder"
          :model-value="(activeSearchColumn?.getFilterValue() as string) ?? ''"
          @update:model-value="activeSearchColumn?.setFilterValue($event)"
        />
      </div>
      <div v-if="enableSelection" class="ml-auto text-xs text-muted-foreground">
        已选 {{ table.getFilteredSelectedRowModel().rows.length }} / {{ table.getFilteredRowModel().rows.length }}
      </div>
    </div>

    <div class="flex-1 overflow-auto rounded-lg border bg-card relative min-h-[120px]">
      <Table :style="props.tableMinWidth > 0 ? { minWidth: `${props.tableMinWidth}px` } : undefined">
        <TableHeader class="sticky top-0 z-10 bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/20">
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="hover:bg-transparent">
            <TableHead v-if="enableSelection" class="w-12 text-center">
              <Checkbox
                :model-value="table.getIsAllRowsSelected() || (table.getIsSomeRowsSelected() && 'indeterminate')"
                @update:model-value="(value: any) => table.toggleAllRowsSelected(!!value)"
              />
            </TableHead>

            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="text-foreground/80"
              :style="props.useColumnSize ? { width: `${header.getSize()}px`, minWidth: `${header.getSize()}px` } : undefined"
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
          <template v-if="loading">
            <TableRow v-for="n in 5" :key="n">
              <TableCell v-if="enableSelection" class="w-12"><Skeleton class="h-4 w-4 mx-auto" /></TableCell>
              <TableCell v-for="m in columns.length" :key="m" class="p-4">
                <Skeleton class="h-4 w-full" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
              class="transition-colors hover:bg-muted/30 data-[state=selected]:bg-primary/5 data-[state=selected]:hover:bg-primary/10 cursor-pointer"
              @click="emit('row-click', row.original)"
            >
              <TableCell v-if="enableSelection" class="w-12 text-center" @click.stop>
                <Checkbox
                  :model-value="row.getIsSelected()"
                  @update:model-value="(value: any) => row.toggleSelected(!!value)"
                />
              </TableCell>

              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="text-sm"
                :class="cellPaddingClass"
                :style="props.useColumnSize ? { width: `${cell.column.getSize()}px`, minWidth: `${cell.column.getSize()}px` } : undefined"
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
                {{ emptyText }}
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
      <div class="text-xs text-muted-foreground">
        {{ pageLabelPrefix }} {{ displayPageIndex }} {{ pageLabelConnector }} {{ displayPageCount }}
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <div v-if="props.pageSizeOptions.length > 0" class="flex items-center gap-2 text-xs text-muted-foreground">
          <span>每页</span>
          <select
            class="h-8 rounded-md border bg-background px-2 text-sm text-foreground"
            :value="String(props.pageSize)"
            @change="emit('page-size-change', Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="size in props.pageSizeOptions" :key="size" :value="String(size)">
              {{ size }}
            </option>
          </select>
          <span>条</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          :disabled="!canPreviousPage"
          @click="goToPreviousPage()"
        >
          {{ prevLabel }}
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="!canNextPage"
          @click="goToNextPage()"
        >
          {{ nextLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>
