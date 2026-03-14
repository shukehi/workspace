export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<TRow> {
  rows: TRow[];
  total: number;
  page: number;
  pageSize: number;
}
