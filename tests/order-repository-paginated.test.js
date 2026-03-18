/**
 * Unit tests for findOrdersPaginated in order.repository.ts
 *
 * These tests mock sequelize and the models so they can run without a database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

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

function makeOrderRow(id, extra = {}) {
    return { id, order_no: `PO-${id}`, status: 'draft', category: '包装', ...extra };
}

// Patch require so the module loads without real DB / Sequelize
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'sequelize') return { Op };
    if (/\/models$/.test(request)) return { Order: {}, OrderItem: {}, OrderIdempotencyKey: {} };
    if (/shared\/constants\/order/.test(request)) return { ORDER_PENDING_STATUSES };
    return origLoad.apply(this, arguments);
};

const repoPath = require.resolve('../server/services/orders/order.repository');
delete require.cache[repoPath];
const repo = require('../server/services/orders/order.repository');

Module._load = origLoad;

// ── Tests ─────────────────────────────────────────────────────────────────

test('findOrdersPaginated: calls findAndCountAll with correct limit and offset', async () => {
    const allRows = Array.from({ length: 25 }, (_, i) => makeOrderRow(i + 1));
    const { Order } = require('../server/models');
    Order.findAndCountAll = async (opts) => {
        const { limit, offset } = opts;
        return {
            count: allRows.length,
            rows: allRows.slice(offset, offset + limit),
        };
    };
    // Patch the Order inside the already-loaded repo module by re-patching
    // via the cached module's internal reference — instead, exercise via real call
    // by temporarily replacing the model on the models module.
    const modelsPath = require.resolve('../server/models');
    const originalModels = require.cache[modelsPath];
    require.cache[modelsPath] = {
        ...originalModels,
        exports: { Order, OrderItem: { }, OrderIdempotencyKey: {} },
    };

    // Force re-load repo to pick up our mock
    delete require.cache[repoPath];
    const patchedLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request)) return { Order, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments);
    };
    const freshRepo = require('../server/services/orders/order.repository');
    Module._load = origLoad;

    const { rows, count } = await freshRepo.findOrdersPaginated({}, 2, 10);

    assert.equal(count, 25);
    assert.equal(rows.length, 10);
    assert.equal(rows[0].id, 11); // page 2 offset = 10

    delete require.cache[repoPath];
});

test('findOrdersPaginated: last page returns remaining rows', async () => {
    const allRows = Array.from({ length: 25 }, (_, i) => makeOrderRow(i + 1));
    const Order = {
        findAndCountAll: async (opts) => {
            const { limit, offset } = opts;
            return { count: allRows.length, rows: allRows.slice(offset, offset + limit) };
        },
    };
    Module._load = function (request, parent, isMain) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request)) return { Order, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments);
    };
    delete require.cache[repoPath];
    const freshRepo = require('../server/services/orders/order.repository');
    Module._load = origLoad;

    const { rows, count } = await freshRepo.findOrdersPaginated({}, 3, 10);

    assert.equal(count, 25);
    assert.equal(rows.length, 5); // 25 - 20 = 5

    delete require.cache[repoPath];
});

test('findOrdersPaginated: passes where clause to findAndCountAll', async () => {
    let capturedOpts = null;
    const Order = {
        findAndCountAll: async (opts) => {
            capturedOpts = opts;
            return { count: 0, rows: [] };
        },
    };
    Module._load = function (request, parent, isMain) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request)) return { Order, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments);
    };
    delete require.cache[repoPath];
    const freshRepo = require('../server/services/orders/order.repository');
    Module._load = origLoad;

    const where = { status: 'submitted' };
    await freshRepo.findOrdersPaginated(where, 1, 20);

    assert.deepEqual(capturedOpts.where, { status: 'submitted' });
    assert.equal(capturedOpts.limit, 20);
    assert.equal(capturedOpts.offset, 0);
    assert.equal(capturedOpts.distinct, true);

    delete require.cache[repoPath];
});

test('buildSimpleWhereFromQuery: category is not added to where (requires Chinese mapping)', () => {
    Module._load = function (request, parent, isMain) {
        if (request === 'sequelize') return { Op };
        if (/\/models$/.test(request)) return { Order: {}, OrderItem: {}, OrderIdempotencyKey: {} };
        if (/shared\/constants\/order/.test(request)) return { ORDER_PENDING_STATUSES };
        return origLoad.apply(this, arguments);
    };
    delete require.cache[repoPath];
    const freshRepo = require('../server/services/orders/order.repository');
    Module._load = origLoad;

    const where = freshRepo.buildSimpleWhereFromQuery({ category: 'cylinder' });
    assert.ok(!('category' in where), 'category should not be in DB where (handled by filterOrders)');

    delete require.cache[repoPath];
});
