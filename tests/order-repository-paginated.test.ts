/**
 * Unit tests for findOrdersPaginated in order.repository.ts
 *
 * These tests mock sequelize and the models so they can run without a database.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'node:module'

// ── Sequelize Op symbols ──────────────────────────────────────────────────
const Op = {
    in: Symbol('Op.in'),
    like: Symbol('Op.like'),
    between: Symbol('Op.between'),
    gte: Symbol('Op.gte'),
    lte: Symbol('Op.lte'),
};

// ── Minimal mocks ─────────────────────────────────────────────────────────
const ORDER_PENDING_STATUSES = ['draft', 'submitted', 'processing', 'arrived'];

function makeOrderRow(id: number, extra: Record<string, unknown> = {}) {
    return { id, order_no: `PO-${id}`, status: 'draft', category: '包装', ...extra };
}

// Patch require so the module loads without real DB / Sequelize
const origLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, parent: unknown, isMain: unknown) {
    if (request === 'sequelize') return { Op };
    if (/\/models$/.test(request as string)) return { Order: {}, OrderItem: {}, OrderIdempotencyKey: {} };
    if (/shared\/constants\/order/.test(request as string)) return { ORDER_PENDING_STATUSES };
    return origLoad.apply(this, arguments as unknown as [unknown, unknown, unknown]);
};

const _require = Module.createRequire(import.meta.url);
const repoPath = _require.resolve('../server/services/orders/order.repository');
delete _require.cache[repoPath];
const repo = _require('../server/services/orders/order.repository');

(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = origLoad;

// ── Tests ─────────────────────────────────────────────────────────────────

test('findOrdersPaginated: calls findAndCountAll with correct limit and offset', async () => {
    const allRows = Array.from({ length: 25 }, (_, i) => makeOrderRow(i + 1));
    const { Order } = _require('../server/models');
    Order.findAndCountAll = async (opts: { limit: number; offset: number }) => {
        const { limit, offset } = opts;
        return {
            count: allRows.length,
            rows: allRows.slice(offset, offset + limit),
        };
    };
    // Patch the Order inside the already-loaded repo module by re-patching
    // via the cached module's internal reference — instead, exercise via real call
    // by temporarily replacing the model on the models module.
    const modelsPath = _require.resolve('../server/models');
    const originalModels = _require.cache[modelsPath];
    _require.cache[modelsPath] = {
        ...originalModels,
        exports: { Order, OrderItem: { }, OrderIdempotencyKey: {} },
    } as any;

    // Force re-load repo to pick up our mock
    delete _require.cache[repoPath];
    const patchedLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, parent: unknown, isMain: unknown) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request as string)) return { Order, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request as string)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments as unknown as [unknown, unknown, unknown]);
    };
    const freshRepo = _require('../server/services/orders/order.repository');
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = origLoad;

    const { rows, count } = await freshRepo.findOrdersPaginated({}, 2, 10);

    assert.equal(count, 25);
    assert.equal(rows.length, 10);
    assert.equal(rows[0].id, 11); // page 2 offset = 10

    delete _require.cache[repoPath];
});

test('findOrdersPaginated: last page returns remaining rows', async () => {
    const allRows = Array.from({ length: 25 }, (_, i) => makeOrderRow(i + 1));
    const Order = {
        findAndCountAll: async (opts: { limit: number; offset: number }) => {
            const { limit, offset } = opts;
            return { count: allRows.length, rows: allRows.slice(offset, offset + limit) };
        },
    };
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, parent: unknown, isMain: unknown) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request as string)) return { Order, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request as string)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments as unknown as [unknown, unknown, unknown]);
    };
    delete _require.cache[repoPath];
    const freshRepo = _require('../server/services/orders/order.repository');
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = origLoad;

    const { rows, count } = await freshRepo.findOrdersPaginated({}, 3, 10);

    assert.equal(count, 25);
    assert.equal(rows.length, 5); // 25 - 20 = 5

    delete _require.cache[repoPath];
});

test('findOrdersPaginated: passes where clause to findAndCountAll', async () => {
    let capturedOpts: { where: unknown; limit: number; offset: number; distinct: boolean } | null = null;
    const Order = {
        findAndCountAll: async (opts: { where: unknown; limit: number; offset: number; distinct: boolean }) => {
            capturedOpts = opts;
            return { count: 0, rows: [] };
        },
    };
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, parent: unknown, isMain: unknown) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request as string)) return { Order, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request as string)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments as unknown as [unknown, unknown, unknown]);
    };
    delete _require.cache[repoPath];
    const freshRepo = _require('../server/services/orders/order.repository');
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = origLoad;

    const where = { status: 'submitted' };
    await freshRepo.findOrdersPaginated(where, 1, 20);

    assert.deepEqual(capturedOpts!.where, { status: 'submitted' });
    assert.equal(capturedOpts!.limit, 20);
    assert.equal(capturedOpts!.offset, 0);
    assert.equal(capturedOpts!.distinct, true);

    delete _require.cache[repoPath];
});

test('buildSimpleWhereFromQuery: category is not added to where (requires Chinese mapping)', () => {
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, parent: unknown, isMain: unknown) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request as string)) return { Order: {}, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request as string)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments as unknown as [unknown, unknown, unknown]);
    };
    delete _require.cache[repoPath];
    const freshRepo = _require('../server/services/orders/order.repository');
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = origLoad;

    const where = freshRepo.buildSimpleWhereFromQuery({ category: 'cylinder' });
    assert.ok(!('category' in where), 'category should not be in DB where (handled by filterOrders)');

    delete _require.cache[repoPath];
});
