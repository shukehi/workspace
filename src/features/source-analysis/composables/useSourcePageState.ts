import { computed, ref } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import { sourceColumns } from '@/components/source/SourceColumns';

type LongTextMode = 'clip' | 'hover' | 'expand';

interface SourcePageStateStore {
  loading: boolean;
  fetchContract: (contractId: string) => void | Promise<void>;
}

interface SourcePageStateOptions {
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

export function useSourcePageState(
  store: SourcePageStateStore,
  options: SourcePageStateOptions = {},
) {
  const contractInput = ref('');
  const longTextMode = ref<LongTextMode>('hover');
  const historyDialogOpen = ref(false);

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

  function handleSearch() {
    const contractCode = contractInput.value.trim();
    if (!contractCode) return;
    void store.fetchContract(contractCode);
  }

  function handleHistoryLoaded(contractCode: string) {
    contractInput.value = contractCode;
  }

  return {
    contractInput,
    longTextMode,
    historyDialogOpen,
    sourceTableMinWidth,
    columns,
    handleSearch,
    handleHistoryLoaded,
  };
}
