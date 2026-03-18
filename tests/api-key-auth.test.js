const test = require('node:test');
const assert = require('node:assert/strict');

// Load middleware fresh for each test by clearing require cache
function loadMiddleware() {
    delete require.cache[require.resolve('../server/app/middleware/apiKeyAuth')];
    return require('../server/app/middleware/apiKeyAuth').apiKeyAuth;
}

function makeReq(headers = {}) {
    return { headers };
}

function makeRes() {
    const res = {
        _status: null,
        _body: null,
        status(code) {
            this._status = code;
            return this;
        },
        json(body) {
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
        assert.equal(res._body.code, 'SERVER_MISCONFIGURATION');
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
        assert.equal(res._body.code, 'UNAUTHORIZED');
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
        assert.equal(res._body.code, 'UNAUTHORIZED');
    } finally {
        delete process.env.API_KEY;
    }
});
