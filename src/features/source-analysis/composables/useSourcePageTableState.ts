import { computed, type Ref } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { sourceColumns } from '@/components/source/SourceColumns';

type LongTextMode = 'clip' | 'hover' | 'expand';

interface SourcePageTableStateOptions {
  renderLongTextCell?: (params: {
    text: string | number | null | undefined;
    mode: LongTextMode;
    maxWidth: number;
    label: string;
  }) => unknown;
}

const longTextColumnKeys = new Set([
  'productModelName',
  'spec',
  'sj',
  'fssj',
  'xsbz',
  'qbbc',
  'bz',
]);

export function useSourcePageTableState(
  longTextMode: Ref<LongTextMode>,
  options: SourcePageTableStateOptions = {},
) {
  const sourceTableMinWidth = computed(() => {
    const indexColumnWidth = 50;
    const contentWidth = sourceColumns.reduce((total, column) => total + (column.width || 100), 0);
    return indexColumnWidth + contentWidth + 120;
  });

  const columns = computed<ColumnDef<any>[]>(() => {
    const cols: ColumnDef<any>[] = [
      {
        id: 'index',
        header: '#',
        cell: ({ row }) => row.index + 1,
        enableSorting: false,
        size: 50,
      },
    ];

    const dataCols = sourceColumns.map((column) => ({
      accessorKey: column.key,
      header: column.label,
      size: column.width || 100,
      cell: ({ row }: any) => {
        const value = row.original[column.key];
        if (!longTextColumnKeys.has(column.key)) {
          return value || '-';
        }

        if (options.renderLongTextCell) {
          return options.renderLongTextCell({
            text: value,
            mode: longTextMode.value,
            maxWidth: column.width || 180,
            label: column.label,
          });
        }

        return value || '-';
      },
    }));

    return [...cols, ...dataCols];
  });

  return {
    sourceTableMinWidth,
    columns,
  };
}
