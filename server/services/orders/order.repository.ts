import type { Sequelize, Transaction } from 'sequelize';
import type {
    OrderAttributes,
    OrderCreationAttributes,
    OrderIdempotencyKeyAttributes,
    OrderIdempotencyKeyCreationAttributes,
    OrderItemAttributes,
    OrderItemCreationAttributes,
    OrderListQuery,
} from '../../models/types';
import type {
    OrderInstance,
    OrderItemInstance,
    OrderIdempotencyKeyInstance,
} from '../../models';

import { Op, QueryTypes } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { Order, OrderItem, OrderIdempotencyKey } from '../../models';
import { ORDER_PENDING_STATUSES, ORDER_STATUSES } from '../../shared/constants/order';

type LooseTransaction = Transaction | undefined;
type OrderWhere = WhereOptions<OrderAttributes>;

const ORDER_ITEM_INCLUDE = [{ model: OrderItem, as: 'items' }];
const ORDER_CATEGORY_KEYS = ['packaging', 'cylinder', 'lockset', 'handle', 'lock', 'hardware'] as const;

type OrderCategoryKey = typeof ORDER_CATEGORY_KEYS[number];

interface OrderQuerySql {
    whereSql: string;
    replacements: Record<string, unknown>;
    categoryExpressions: Record<OrderCategoryKey, string>;
    highRiskSql: string;
    anyRiskSql: string;
}

interface OrderAggregateRow {
    total?: number | string | null;
    total_amount?: number | string | null;
    pending_count?: number | string | null;
    completed_count?: number | string | null;
    today_count?: number | string | null;
    status_draft?: number | string | null;
    status_submitted?: number | string | null;
    status_processing?: number | string | null;
    status_arrived?: number | string | null;
    status_completed?: number | string | null;
    status_cancelled?: number | string | null;
    category_packaging?: number | string | null;
    category_cylinder?: number | string | null;
    category_lockset?: number | string | null;
    category_handle?: number | string | null;
    category_lock?: number | string | null;
    category_hardware?: number | string | null;
    risk_count?: number | string | null;
    manual_count?: number | string | null;
}

function readQueryText(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function normalizeCategoryFilter(value: unknown): OrderCategoryKey {
    const raw = readQueryText(value).toLowerCase();
    if (raw === 'cylinder' || raw.includes('锁芯')) return 'cylinder';
    if (raw === 'lockset' || raw.includes('锁具')) return 'lockset';
    if (raw === 'handle' || raw.includes('拉手')) return 'handle';
    if (raw === 'lock' || raw.includes('锁叉')) return 'lock';
    if (raw === 'hardware' || raw.includes('五金') || raw.includes('配件')) return 'hardware';
    return 'packaging';
}

function buildCategoryExpressions(columnSql: string): Record<OrderCategoryKey, string> {
    const cylinder = `(LOWER(COALESCE(${columnSql}, '')) = 'cylinder' OR COALESCE(${columnSql}, '') LIKE '%锁芯%')`;
    const lockset = `(LOWER(COALESCE(${columnSql}, '')) = 'lockset' OR COALESCE(${columnSql}, '') LIKE '%锁具%')`;
    const handle = `(LOWER(COALESCE(${columnSql}, '')) = 'handle' OR COALESCE(${columnSql}, '') LIKE '%拉手%')`;
    const lock = `(LOWER(COALESCE(${columnSql}, '')) = 'lock' OR COALESCE(${columnSql}, '') LIKE '%锁叉%')`;
    const hardware = `(
        LOWER(COALESCE(${columnSql}, '')) = 'hardware'
        OR COALESCE(${columnSql}, '') LIKE '%五金%'
        OR COALESCE(${columnSql}, '') LIKE '%配件%'
    )`;
    const packaging = `(
        LOWER(COALESCE(${columnSql}, '')) = 'packaging'
        OR COALESCE(${columnSql}, '') LIKE '%包装%'
        OR NOT (${cylinder} OR ${lockset} OR ${handle} OR ${lock} OR ${hardware})
    )`;

    return {
        packaging,
        cylinder,
        lockset,
        handle,
        lock,
        hardware,
    };
}

function buildHighRiskSql(orderAlias: string): string {
    const riskDismissedSql = `COALESCE(json_extract(${orderAlias}.metadata, '$.riskWarningDismissed'), 0) IN (1, '1', 'true')`;
    return `(NOT (${riskDismissedSql}) AND EXISTS (
        SELECT 1
        FROM order_items oi
        WHERE oi.order_id = ${orderAlias}.id
          AND (
              COALESCE(oi.supplier, '') LIKE '%待人工处理%'
              OR COALESCE(oi.type, oi.name, '') LIKE '%未匹配%'
              OR COALESCE(oi.remark, '') LIKE '%待人工处理%'
          )
    ))`;
}

function buildMediumRiskSql(orderAlias: string): string {
    const riskDismissedSql = `COALESCE(json_extract(${orderAlias}.metadata, '$.riskWarningDismissed'), 0) IN (1, '1', 'true')`;
    return `(NOT (${riskDismissedSql}) AND EXISTS (
        SELECT 1
        FROM order_items oi
        WHERE oi.order_id = ${orderAlias}.id
          AND (
              COALESCE(oi.type, oi.name, '') LIKE '%待确认%'
              OR COALESCE(oi.remark, '') LIKE '%待确认%'
              OR COALESCE(oi.remark, '') LIKE '%未识别%'
          )
    ))`;
}

function buildOrderQuerySql(query: OrderListQuery = {}, orderAlias = 'o'): OrderQuerySql {
    const clauses = ['1 = 1'];
    const replacements: Record<string, unknown> = {};
    const categoryExpressions = buildCategoryExpressions(`${orderAlias}.category`);
    const highRiskSql = buildHighRiskSql(orderAlias);
    const anyRiskSql = `(${highRiskSql} OR ${buildMediumRiskSql(orderAlias)})`;

    const status = readQueryText(query.status);
    if (status && status !== 'ALL') {
        if (status === 'PENDING') {
            const pendingStatuses = ORDER_PENDING_STATUSES
                .map((_, index) => `:pendingStatus${index}`)
                .join(', ');
            ORDER_PENDING_STATUSES.forEach((value, index) => {
                replacements[`pendingStatus${index}`] = value;
            });
            clauses.push(`${orderAlias}.status IN (${pendingStatuses})`);
        } else {
            replacements.status = status;
            clauses.push(`${orderAlias}.status = :status`);
        }
    }

    const category = readQueryText(query.category);
    if (category && category !== 'ALL') {
        clauses.push(categoryExpressions[normalizeCategoryFilter(category)]);
    }

    const supplier = readQueryText(query.supplier).toLowerCase();
    if (supplier) {
        replacements.supplierLike = `%${supplier}%`;
        clauses.push(`LOWER(COALESCE(${orderAlias}.supplier, '')) LIKE :supplierLike`);
    }

    const createdDate = readQueryText(query.createdDate);
    if (createdDate && /^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
        replacements.createdDateLike = `${createdDate}%`;
        clauses.push(`COALESCE(${orderAlias}.created_at, '') LIKE :createdDateLike`);
    }

    const startDate = readQueryText(query.startDate);
    const endDate = readQueryText(query.endDate);
    if (startDate && endDate) {
        replacements.startDate = `${startDate} 00:00:00`;
        replacements.endDate = `${endDate} 23:59:59`;
        clauses.push(`${orderAlias}.created_at BETWEEN :startDate AND :endDate`);
    } else if (startDate) {
        replacements.startDate = `${startDate} 00:00:00`;
        clauses.push(`${orderAlias}.created_at >= :startDate`);
    } else if (endDate) {
        replacements.endDate = `${endDate} 23:59:59`;
        clauses.push(`${orderAlias}.created_at <= :endDate`);
    }

    const orderNo = readQueryText(query.orderNo).toLowerCase();
    if (orderNo) {
        replacements.orderNoLike = `%${orderNo}%`;
        clauses.push(`LOWER(COALESCE(${orderAlias}.order_no, '')) LIKE :orderNoLike`);
    }

    const keyword = readQueryText(query.keyword).toLowerCase();
    if (keyword) {
        replacements.keywordLike = `%${keyword}%`;
        clauses.push(`(
            LOWER(COALESCE(${orderAlias}.order_no, '')) LIKE :keywordLike
            OR LOWER(COALESCE(${orderAlias}.supplier, '')) LIKE :keywordLike
            OR EXISTS (
                SELECT 1
                FROM order_items oi
                WHERE oi.order_id = ${orderAlias}.id
                  AND LOWER(COALESCE(oi.name, '') || COALESCE(oi.model, '')) LIKE :keywordLike
            )
        )`);
    }

    const risk = readQueryText(query.risk);
    if (risk && risk !== 'ALL') {
        if (risk === 'MANUAL') {
            clauses.push(highRiskSql);
        } else if (risk === 'RISK') {
            clauses.push(anyRiskSql);
        }
    }

    return {
        whereSql: clauses.join('\n      AND '),
        replacements,
        categoryExpressions,
        highRiskSql,
        anyRiskSql,
    };
}

function toNumber(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function getOrderSequelize() {
    const sequelize = (Order as unknown as { sequelize?: { query: unknown } }).sequelize;
    if (!sequelize || typeof sequelize.query !== 'function') {
        throw new Error('Order sequelize instance is unavailable');
    }
    return sequelize as Sequelize;
}

export async function createIdempotencyKey(
    values: OrderIdempotencyKeyCreationAttributes,
    transaction?: LooseTransaction,
): Promise<OrderIdempotencyKeyInstance> {
    return await OrderIdempotencyKey.create(values, { transaction }) as unknown as OrderIdempotencyKeyInstance;
}

export async function findActiveIdempotencyKey(
    scope: string,
    dedupeKey: string,
    transaction?: LooseTransaction,
): Promise<OrderIdempotencyKeyInstance | null> {
    return await OrderIdempotencyKey.findOne({
        where: {
            scope,
            dedupe_key: dedupeKey,
            active: true
        },
        transaction
    }) as unknown as OrderIdempotencyKeyInstance | null;
}

export async function updateActiveIdempotencyKeysByOrderId(
    orderId: number,
    values: Partial<OrderIdempotencyKeyAttributes>,
    transaction?: LooseTransaction,
): Promise<[number]> {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, active: true },
        transaction
    });
}

export async function updateScopedIdempotencyKeysByOrderId(
    orderId: number,
    scope: string,
    values: Partial<OrderIdempotencyKeyAttributes>,
    transaction?: LooseTransaction,
): Promise<[number]> {
    return await OrderIdempotencyKey.update(values, {
        where: { order_id: orderId, scope },
        transaction
    });
}

export async function destroyIdempotencyKeysByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await OrderIdempotencyKey.destroy({ where: { order_id: orderId }, transaction });
}

export async function findAllOrdersWithItems(
    where: OrderWhere = {},
    transaction?: LooseTransaction,
): Promise<OrderInstance[]> {
    return await Order.findAll({
        where,
        include: ORDER_ITEM_INCLUDE,
        order: [['created_at', 'DESC']],
        transaction
    }) as unknown as OrderInstance[];
}

export async function findOrdersWithItemsByIds(
    ids: number[],
    transaction?: LooseTransaction,
): Promise<OrderInstance[]> {
    if (ids.length === 0) return [];

    return await Order.findAll({
        where: {
            id: { [Op.in]: ids },
        },
        include: ORDER_ITEM_INCLUDE,
        transaction,
    }) as unknown as OrderInstance[];
}

export async function findOrdersPaginated(
    where: OrderWhere,
    page: number,
    pageSize: number,
    transaction?: LooseTransaction,
): Promise<{ rows: OrderInstance[]; count: number }> {
    const { count, rows } = await Order.findAndCountAll({
        where,
        include: ORDER_ITEM_INCLUDE,
        order: [['created_at', 'DESC']],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        distinct: true,
        transaction,
    }) as unknown as { rows: OrderInstance[]; count: number };
    return { rows, count };
}

export async function findOrderByIdWithItems(
    id: number | string,
    transaction?: LooseTransaction,
): Promise<OrderInstance | null> {
    return await Order.findByPk(id, {
        include: ORDER_ITEM_INCLUDE,
        transaction
    }) as unknown as OrderInstance | null;
}

export async function findOrderById(
    id: number | string,
    transaction?: LooseTransaction,
): Promise<OrderInstance | null> {
    return await Order.findByPk(id, { transaction }) as unknown as OrderInstance | null;
}

export async function createOrder(
    values: OrderCreationAttributes,
    transaction?: LooseTransaction,
): Promise<OrderInstance> {
    return await Order.create(values, { transaction }) as unknown as OrderInstance;
}

export async function bulkCreateOrderItems(
    items: OrderItemCreationAttributes[],
    transaction?: LooseTransaction,
): Promise<OrderItemInstance[]> {
    return await OrderItem.bulkCreate(items, { transaction }) as unknown as OrderItemInstance[];
}

export async function updateOrderCreatedAt(
    id: number,
    createdAt: Date | string,
    transaction?: LooseTransaction,
): Promise<[number]> {
    return await Order.update(
        { created_at: new Date(createdAt) },
        { where: { id }, transaction: transaction ?? undefined, silent: true }
    );
}

export async function replaceOrderItems(
    orderId: number,
    items: OrderItemCreationAttributes[],
    transaction?: LooseTransaction,
): Promise<OrderItemInstance[]> {
    await OrderItem.destroy({ where: { order_id: orderId }, transaction });
    return await OrderItem.bulkCreate(items, { transaction }) as unknown as OrderItemInstance[];
}

export async function findOrderItemsByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<OrderItemInstance[]> {
    return await OrderItem.findAll({ where: { order_id: orderId }, transaction }) as unknown as OrderItemInstance[];
}

export async function destroyOrderItemsByOrderId(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await OrderItem.destroy({ where: { order_id: orderId }, transaction });
}

export async function destroyOrderById(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<number> {
    return await Order.destroy({ where: { id: orderId }, transaction });
}

export async function findPaginatedOrderIds(
    query: OrderListQuery,
    page: number,
    pageSize: number,
    transaction?: LooseTransaction,
): Promise<number[]> {
    const sequelize = getOrderSequelize();
    const { whereSql, replacements } = buildOrderQuerySql(query);

    const rows = await sequelize.query<{ id: number }>(
        `
            SELECT o.id
            FROM orders o
            WHERE ${whereSql}
            ORDER BY o.created_at DESC, o.id DESC
            LIMIT :limit OFFSET :offset
        `,
        {
            replacements: {
                ...replacements,
                limit: pageSize,
                offset: (page - 1) * pageSize,
            },
            type: QueryTypes.SELECT,
            transaction,
        }
    );

    return rows
        .map((row) => Number(row.id))
        .filter((id) => Number.isInteger(id) && id > 0);
}

export async function getPaginatedOrderAggregates(
    query: OrderListQuery,
    transaction?: LooseTransaction,
): Promise<{
    total: number;
    summary: {
        totalAmount: number;
        pendingCount: number;
        completedCount: number;
        todayCount: number;
    };
    facets: {
        statusCounts: Record<string, number>;
        categoryCounts: Record<string, number>;
        riskCounts: Record<string, number>;
    };
}> {
    const sequelize = getOrderSequelize();
    const { whereSql, replacements, categoryExpressions, highRiskSql, anyRiskSql } = buildOrderQuerySql(query);
    const today = new Date().toISOString().split('T')[0];
    const pendingStatuses = ORDER_PENDING_STATUSES
        .map((_, index) => `:summaryPendingStatus${index}`)
        .join(', ');
    const statusSelect = ORDER_STATUSES.map((status) => (
        `SUM(CASE WHEN o.status = '${status}' THEN 1 ELSE 0 END) AS status_${status}`
    )).join(',\n                ');
    const categorySelect = ORDER_CATEGORY_KEYS.map((category) => (
        `SUM(CASE WHEN ${categoryExpressions[category]} THEN 1 ELSE 0 END) AS category_${category}`
    )).join(',\n                ');

    ORDER_PENDING_STATUSES.forEach((value, index) => {
        replacements[`summaryPendingStatus${index}`] = value;
    });

    const rows = await sequelize.query<OrderAggregateRow>(
        `
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(COALESCE(item_totals.total_amount, 0)), 0) AS total_amount,
                SUM(CASE WHEN o.status IN (${pendingStatuses}) THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN COALESCE(o.created_at, '') LIKE :todayLike THEN 1 ELSE 0 END) AS today_count,
                ${statusSelect},
                ${categorySelect},
                SUM(CASE WHEN ${anyRiskSql} THEN 1 ELSE 0 END) AS risk_count,
                SUM(CASE WHEN ${highRiskSql} THEN 1 ELSE 0 END) AS manual_count
            FROM orders o
            LEFT JOIN (
                SELECT order_id, SUM(COALESCE(price, 0) * COALESCE(quantity, 0)) AS total_amount
                FROM order_items
                GROUP BY order_id
            ) item_totals ON item_totals.order_id = o.id
            WHERE ${whereSql}
        `,
        {
            replacements: {
                ...replacements,
                todayLike: `${today}%`,
            },
            type: QueryTypes.SELECT,
            transaction,
        }
    );

    const row = rows[0] || {};
    const total = toNumber(row.total);
    const statusCounts: Record<string, number> = { ALL: total };
    const categoryCounts: Record<string, number> = { ALL: total };

    ORDER_STATUSES.forEach((status) => {
        statusCounts[status] = toNumber(row[`status_${status}` as keyof OrderAggregateRow]);
    });
    ORDER_CATEGORY_KEYS.forEach((category) => {
        categoryCounts[category] = toNumber(row[`category_${category}` as keyof OrderAggregateRow]);
    });

    return {
        total,
        summary: {
            totalAmount: toNumber(row.total_amount),
            pendingCount: toNumber(row.pending_count),
            completedCount: toNumber(row.completed_count),
            todayCount: toNumber(row.today_count),
        },
        facets: {
            statusCounts,
            categoryCounts,
            riskCounts: {
                ALL: total,
                RISK: toNumber(row.risk_count),
                MANUAL: toNumber(row.manual_count),
            },
        },
    };
}

/**
 * 将请求查询参数转换为可直接传入 Sequelize where 子句的对象。
 * 只处理可以安全推到数据库的简单条件。
 * 复杂条件（risk、keyword 含 item 内容）保留在内存过滤层处理。
 */
export function buildSimpleWhereFromQuery(query: Record<string, unknown>): OrderWhere {
    const where: Record<string, unknown> = {};

    const status = query.status ? String(query.status).trim() : '';
    if (status && status !== 'ALL') {
        if (status === 'PENDING') {
            where.status = { [Op.in]: ORDER_PENDING_STATUSES };
        } else {
            where.status = status;
        }
    }

    // category requires Chinese↔English normalization (handled by filterOrders in memory)

    const supplier = query.supplier ? String(query.supplier).trim() : '';
    if (supplier) {
        where.supplier = { [Op.like]: `%${supplier}%` };
    }

    const createdDate = query.createdDate ? String(query.createdDate).trim() : '';
    if (createdDate && /^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
        where.created_at = { [Op.like]: `${createdDate}%` };
    }

    const startDate = query.startDate ? String(query.startDate).trim() : '';
    const endDate = query.endDate ? String(query.endDate).trim() : '';
    if (startDate && endDate) {
        where.created_at = { [Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`] };
    } else if (startDate) {
        where.created_at = { [Op.gte]: `${startDate} 00:00:00` };
    } else if (endDate) {
        where.created_at = { [Op.lte]: `${endDate} 23:59:59` };
    }

    const orderNo = query.orderNo ? String(query.orderNo).trim() : '';
    if (orderNo) {
        where.order_no = { [Op.like]: `%${orderNo}%` };
    }

    return where as OrderWhere;
}
