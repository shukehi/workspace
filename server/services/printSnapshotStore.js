const crypto = require('crypto');

const SNAPSHOT_TTL_MS = 1000 * 60 * 30; // 30 min
const MAX_SNAPSHOT_ENTRIES = Math.max(10, Number(process.env.PRINT_SNAPSHOT_MAX_ENTRIES || 200));
const MAX_SNAPSHOT_PAYLOAD_BYTES = Math.max(16 * 1024, Number(process.env.PRINT_SNAPSHOT_MAX_PAYLOAD_BYTES || 2 * 1024 * 1024));
const snapshots = new Map();

let lastCleanupAt = 0;

function estimatePayloadBytes(payload) {
    try {
        return Buffer.byteLength(JSON.stringify(payload), 'utf8');
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

function evictOldestSnapshot() {
    let oldestKey = null;
    let oldestCreatedAt = Number.POSITIVE_INFINITY;

    for (const [id, snapshot] of snapshots.entries()) {
        const createdAt = Number(snapshot?.createdAt || 0);
        if (createdAt < oldestCreatedAt) {
            oldestCreatedAt = createdAt;
            oldestKey = id;
        }
    }

    if (oldestKey) {
        snapshots.delete(oldestKey);
    }
}

function cleanupExpiredSnapshots() {
    const now = Date.now();
    if (now - lastCleanupAt < 30_000) {
        return;
    }

    for (const [id, snapshot] of snapshots.entries()) {
        if (!snapshot || snapshot.expiresAt <= now) {
            snapshots.delete(id);
        }
    }

    lastCleanupAt = now;
}

function createSnapshot(payload, ttlMs = SNAPSHOT_TTL_MS) {
    const payloadBytes = estimatePayloadBytes(payload);
    if (!Number.isFinite(payloadBytes) || payloadBytes > MAX_SNAPSHOT_PAYLOAD_BYTES) {
        const error = new Error('Snapshot payload too large');
        error.code = 'SNAPSHOT_PAYLOAD_TOO_LARGE';
        throw error;
    }

    cleanupExpiredSnapshots();
    while (snapshots.size >= MAX_SNAPSHOT_ENTRIES) {
        evictOldestSnapshot();
    }

    const id = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString('hex');

    const createdAt = Date.now();
    const expiresAt = createdAt + ttlMs;

    snapshots.set(id, {
        payload,
        createdAt,
        expiresAt,
        payloadBytes,
    });

    return {
        snapshotId: id,
        createdAt,
        expiresAt,
    };
}

function getSnapshot(snapshotId) {
    cleanupExpiredSnapshots();
    const record = snapshots.get(snapshotId);
    if (!record) return null;

    if (record.expiresAt <= Date.now()) {
        snapshots.delete(snapshotId);
        return null;
    }

    return {
        payload: record.payload,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
    };
}

function deleteSnapshot(snapshotId) {
    return snapshots.delete(snapshotId);
}

module.exports = {
    SNAPSHOT_TTL_MS,
    MAX_SNAPSHOT_ENTRIES,
    MAX_SNAPSHOT_PAYLOAD_BYTES,
    createSnapshot,
    getSnapshot,
    deleteSnapshot,
};
