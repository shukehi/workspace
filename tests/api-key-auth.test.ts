import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const _require = createRequire(import.meta.url)

// Load middleware fresh for each test by clearing require cache
function loadMiddleware() {
    delete _require.cache[_require.resolve('../server/app/middleware/apiKeyAuth')];
    return _require('../server/app/middleware/apiKeyAuth').apiKeyAuth;
}

function makeReq(headers = {}) {
    return { headers };
}

function makeRes() {
    const res = {
        _status: null as number | null,
        _body: null as unknown,
        status(code: number) {
            this._status = code;
            return this;
        },
        json(body: unknown) {
            this._body = body;
            return this;
        },
    };
    return res;
}

// ── When API_KEY is not set ────────────────────────────────────────────────

test('apiKeyAuth: API_KEY unset + non-production env → calls next()', () => {
    delete process.env.API_KEY;
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
        const apiKeyAuth = loadMiddleware();
        let called = false;
        apiKeyAuth(makeReq(), makeRes(), () => { called = true; });
        assert.ok(called, 'next() should be called');
    } finally {
        process.env.NODE_ENV = origEnv;
    }
});

test('apiKeyAuth: API_KEY unset + test env → calls next()', () => {
    delete process.env.API_KEY;
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
        const apiKeyAuth = loadMiddleware();
        let called = false;
        apiKeyAuth(makeReq(), makeRes(), () => { called = true; });
        assert.ok(called, 'next() should be called in non-production env');
    } finally {
        process.env.NODE_ENV = origEnv;
    }
});

test('apiKeyAuth: API_KEY unset + production env → 500 SERVER_MISCONFIGURATION', () => {
    delete process.env.API_KEY;
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        const apiKeyAuth = loadMiddleware();
        const res = makeRes();
        let nextCalled = false;
        apiKeyAuth(makeReq(), res, () => { nextCalled = true; });
        assert.ok(!nextCalled, 'next() should NOT be called');
        assert.equal(res._status, 500);
        assert.equal((res._body as { code: string }).code, 'SERVER_MISCONFIGURATION');
    } finally {
        process.env.NODE_ENV = origEnv;
    }
});

// ── When API_KEY is set ───────────────────────────────────────────────────

test('apiKeyAuth: correct x-api-key header → calls next()', () => {
    process.env.API_KEY = 'secret-key-123';
    try {
        const apiKeyAuth = loadMiddleware();
        let called = false;
        apiKeyAuth(makeReq({ 'x-api-key': 'secret-key-123' }), makeRes(), () => { called = true; });
        assert.ok(called, 'next() should be called with correct key');
    } finally {
        delete process.env.API_KEY;
    }
});

test('apiKeyAuth: wrong x-api-key header → 401 UNAUTHORIZED', () => {
    process.env.API_KEY = 'secret-key-123';
    try {
        const apiKeyAuth = loadMiddleware();
        const res = makeRes();
        let nextCalled = false;
        apiKeyAuth(makeReq({ 'x-api-key': 'wrong-key' }), res, () => { nextCalled = true; });
        assert.ok(!nextCalled, 'next() should NOT be called with wrong key');
        assert.equal(res._status, 401);
        assert.equal((res._body as { code: string }).code, 'UNAUTHORIZED');
    } finally {
        delete process.env.API_KEY;
    }
});

test('apiKeyAuth: missing x-api-key header → 401 UNAUTHORIZED', () => {
    process.env.API_KEY = 'secret-key-123';
    try {
        const apiKeyAuth = loadMiddleware();
        const res = makeRes();
        let nextCalled = false;
        apiKeyAuth(makeReq({}), res, () => { nextCalled = true; });
        assert.ok(!nextCalled, 'next() should NOT be called with no key');
        assert.equal(res._status, 401);
        assert.equal((res._body as { code: string }).code, 'UNAUTHORIZED');
    } finally {
        delete process.env.API_KEY;
    }
});
