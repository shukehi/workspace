interface ValidationIssue {
    target: string;
    field: string;
    message: string;
}

type UnknownRecord = Record<string, unknown>;

export function createIssue(target: string, field: string, message: string): ValidationIssue {
    return { target, field, message };
}

export function isPlainObject(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateInventoryIdParams(params?: UnknownRecord): ValidationIssue[] {
    const id = Number(params?.id);
    if (!Number.isInteger(id) || id <= 0) {
        return [createIssue('params', 'id', '库存物料 id 必须为正整数')];
    }
    return [];
}

export function validateInventoryListQuery(query: UnknownRecord = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (query.warehouseId !== undefined) {
        const warehouseId = Number(query.warehouseId);
        if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
            issues.push(createIssue('query', 'warehouseId', 'warehouseId 必须为正整数'));
        }
    }
    if (query.locationId !== undefined) {
        const locationId = Number(query.locationId);
        if (!Number.isInteger(locationId) || locationId <= 0) {
            issues.push(createIssue('query', 'locationId', 'locationId 必须为正整数'));
        }
    }
    if (query.keyword !== undefined && typeof query.keyword !== 'string') {
        issues.push(createIssue('query', 'keyword', 'keyword 必须为字符串'));
    }
    if (query.lowStockOnly !== undefined && !['true', 'false', '1', '0'].includes(String(query.lowStockOnly).toLowerCase())) {
        issues.push(createIssue('query', 'lowStockOnly', 'lowStockOnly 必须为布尔值'));
    }
    return issues;
}

export function validateInventoryUpdateBody(body: unknown): ValidationIssue[] {
    if (!isPlainObject(body)) {
        return [createIssue('body', 'body', '请求体必须为对象')];
    }

    const issues: ValidationIssue[] = [];
    if (body.stock_quantity !== undefined && !Number.isFinite(Number(body.stock_quantity))) {
        issues.push(createIssue('body', 'stock_quantity', '库存数量必须为有效数字'));
    }

    if (body.min_stock !== undefined && !Number.isFinite(Number(body.min_stock))) {
        issues.push(createIssue('body', 'min_stock', '安全库存必须为有效数字'));
    }

    if (body.stock_quantity === undefined && body.min_stock === undefined) {
        issues.push(createIssue('body', 'min_stock', '至少需要提供安全库存'));
    }

    return issues;
}
