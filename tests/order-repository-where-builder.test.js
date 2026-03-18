/**
 * Unit tests for buildSimpleWhereFromQuery in order.repository.ts
 *
 * These tests mock sequelize and the models so they can run without a database.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// ── Sequelize Op symbols ──────────────────────────────────────────────────
// Mirror the actual Op symbols so assertions match without a real sequelize install.
const Op = {
    in: Symbol('Op.in'),
    like: Symbol('Op.like'),
    between: Symbol('Op.between'),
    gte: Symbol('Op.gte'),
    lte: Symbol('Op.lte'),
};

// ── Minimal mocks ─────────────────────────────────────────────────────────
const ORDER_PENDING_STATUSES = ['draft', 'submitted', 'processing', 'arrived'];

// Patch require so the module loads without real DB / Sequelize
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'sequelize') return { Op };
    if (/\/models$/.test(request)) return { Order: {}, OrderItem: {}, OrderIdempotencyKey: {} };
    if (/shared\/constants\/order/.test(request)) return { ORDER_PENDING_STATUSES };
    return origLoad.apply(this, arguments);
};

// Force a fresh load of the repository module
const repoPath = require.resolve('../server/services/orders/order.repository');
delete require.cache[repoPath];
const { buildSimpleWhereFromQuery } = require('../server/services/orders/order.repository');

// Restore require
Module._load = origLoad;

// ── Tests ─────────────────────────────────────────────────────────────────

test('buildSimpleWhereFromQuery: empty query → empty where', () => {
    const where = buildSimpleWhereFromQuery({});
    assert.deepEqual(where, {});
});

test('buildSimpleWhereFromQuery: status=ALL → no status clause', () => {
    const where = buildSimpleWhereFromQuery({ status: 'ALL' });
    assert.ok(!('status' in where));
});

test('buildSimpleWhereFromQuery: status=completed → exact match', () => {
    const where = buildSimpleWhereFromQuery({ status: 'completed' });
    assert.equal(where.status, 'completed');
});

test('buildSimpleWhereFromQuery: status=PENDING → Op.in with pending statuses', () => {
    const where = buildSimpleWhereFromQuery({ status: 'PENDING' });
    assert.deepEqual(where.status[Op.in], ORDER_PENDING_STATUSES);
});

test('buildSimpleWhereFromQuery: category (any value) → not added to where (Chinese mapping handled by filterOrders)', () => {
    const where = buildSimpleWhereFromQuery({ category: 'lock' });
    assert.ok(!('category' in where));
});

test('buildSimpleWhereFromQuery: category=ALL → no category clause', () => {
    const where = buildSimpleWhereFromQuery({ category: 'ALL' });
    assert.ok(!('category' in where));
});

test('buildSimpleWhereFromQuery: supplier partial text → Op.like', () => {
    const where = buildSimpleWhereFromQuery({ supplier: '东方' });
    assert.equal(where.supplier[Op.like], '%东方%');
});

test('buildSimpleWhereFromQuery: orderNo partial text → Op.like', () => {
    const where = buildSimpleWhereFromQuery({ orderNo: 'PO-2026' });
    assert.equal(where.order_no[Op.like], '%PO-2026%');
});

test('buildSimpleWhereFromQuery: createdDate valid date → Op.like prefix', () => {
    const where = buildSimpleWhereFromQuery({ createdDate: '2026-03-18' });
    assert.equal(where.created_at[Op.like], '2026-03-18%');
});

test('buildSimpleWhereFromQuery: createdDate invalid format → ignored', () => {
    const where = buildSimpleWhereFromQuery({ createdDate: '20260318' });
    assert.ok(!('created_at' in where));
});

test('buildSimpleWhereFromQuery: startDate + endDate → Op.between', () => {
    const where = buildSimpleWhereFromQuery({ startDate: '2026-01-01', endDate: '2026-03-31' });
    assert.deepEqual(where.created_at[Op.between], ['2026-01-01 00:00:00', '2026-03-31 23:59:59']);
});

test('buildSimpleWhereFromQuery: startDate only → Op.gte', () => {
    const where = buildSimpleWhereFromQuery({ startDate: '2026-01-01' });
    assert.equal(where.created_at[Op.gte], '2026-01-01 00:00:00');
});

test('buildSimpleWhereFromQuery: endDate only → Op.lte', () => {
    const where = buildSimpleWhereFromQuery({ endDate: '2026-03-31' });
    assert.equal(where.created_at[Op.lte], '2026-03-31 23:59:59');
});

test('buildSimpleWhereFromQuery: whitespace-only values → ignored', () => {
    const where = buildSimpleWhereFromQuery({ supplier: '  ', orderNo: '\t', category: ' ' });
    assert.deepEqual(where, {});
});

test('buildSimpleWhereFromQuery: multiple filters combined (category excluded, handled by filterOrders)', () => {
    const where = buildSimpleWhereFromQuery({
        status: 'completed',
        category: 'cylinder',
        supplier: 'ABC',
        orderNo: 'PO-001',
    });
    assert.equal(where.status, 'completed');
    assert.ok(!('category' in where));
    assert.equal(where.supplier[Op.like], '%ABC%');
    assert.equal(where.order_no[Op.like], '%PO-001%');
});
