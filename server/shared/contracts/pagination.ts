export interface PaginationResponse<T> {
    rows: T[];
    total: number;
    page: number;
    pageSize: number;
    summary?: unknown;
    facets?: unknown;
}

interface PaginationResponseInput<T> {
    rows?: T[];
    total?: number;
    page?: number;
    pageSize?: number;
    summary?: unknown;
    facets?: unknown;
}

export function createPaginationResponse<T>({
    rows = [],
    total = 0,
    page = 1,
    pageSize = 20,
    summary,
    facets,
}: PaginationResponseInput<T>): PaginationResponse<T> {
    return {
        rows,
        total,
        page,
        pageSize,
        ...(summary !== undefined ? { summary } : {}),
        ...(facets !== undefined ? { facets } : {}),
    };
}

// 兼容 CommonJS 消费方
