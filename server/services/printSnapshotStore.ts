import crypto from 'crypto';

export const SNAPSHOT_TTL_MS = 1000 * 60 * 30; // 30 min
export const MAX_SNAPSHOT_ENTRIES = Math.max(10, Number(process.env.PRINT_SNAPSHOT_MAX_ENTRIES || 200));
export const MAX_SNAPSHOT_PAYLOAD_BYTES = Math.max(16 * 1024, Number(process.env.PRINT_SNAPSHOT_MAX_PAYLOAD_BYTES || 2 * 1024 * 1024));

interface SnapshotRecord {
    payload: unknown;
    createdAt: number;
    expiresAt: number;
    payloadBytes: number;
}

interface SnapshotResult {
    snapshotId: string;
    createdAt: number;
    expiresAt: number;
}

interface SnapshotData {
    payload: unknown;
    createdAt: number;
    expiresAt: number;
}

const snapshots = new Map<string, SnapshotRecord>();

let lastCleanupAt = 0;

function estimatePayloadBytes(payload: unknown): number {
    try {
        return Buffer.byteLength(JSON.stringify(payload), 'utf8');
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

function evictOldestSnapshot(): void {
    let oldestKey: string | null = null;
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

function cleanupExpiredSnapshots(): void {
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

export function createSnapshot(payload: unknown, ttlMs: number = SNAPSHOT_TTL_MS): SnapshotResult {
    const payloadBytes = estimatePayloadBytes(payload);
    if (!Number.isFinite(payloadBytes) || payloadBytes > MAX_SNAPSHOT_PAYLOAD_BYTES) {
        const error: NodeJS.ErrnoException = new Error('Snapshot payload too large');
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

export function getSnapshot(snapshotId: string): SnapshotData | null {
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

export function deleteSnapshot(snapshotId: string): boolean {
    return snapshots.delete(snapshotId);
}

