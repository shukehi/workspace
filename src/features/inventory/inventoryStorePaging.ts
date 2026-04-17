export type PagedRowsResponse<T> = {
  rows?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};

export function normalizePagedRowsResponse<T>(
  response: PagedRowsResponse<T> | null | undefined,
  fallback: { page?: number; pageSize?: number },
) {
  return {
    rows: Array.isArray(response?.rows) ? response.rows : [],
    total: Number(response?.total || 0),
    page: Number(response?.page || fallback.page || 1),
    pageSize: Number(response?.pageSize || fallback.pageSize || 50),
  };
}

export async function fetchAllPagedRows<T, TParams extends object>(options: {
  pageSize?: number;
  params?: TParams;
  fetchPage: (params: TParams & { page: number; pageSize: number }) => Promise<PagedRowsResponse<T> | null | undefined>;
}) {
  const pageSize = options.pageSize ?? 200;
  const baseParams = (options.params || {}) as TParams;
  let page = 1;
  let total = 0;
  const rows: T[] = [];

  do {
    const response = await options.fetchPage({ ...baseParams, page, pageSize });
    const chunk = Array.isArray(response?.rows) ? response.rows : [];
    total = Number(response?.total || 0);
    rows.push(...chunk);
    if (chunk.length === 0) break;
    page += 1;
  } while (rows.length < total);

  return rows;
}
