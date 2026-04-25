/**
 * Lightweight structured logger.
 *
 * The server only needs a small pino-compatible surface (`info`, `warn`,
 * `error`, `debug`). Keeping it local avoids a hard runtime dependency for
 * tests and CLI scripts while still emitting structured JSON in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

type LogMethod = {
    (message: string): void;
    (meta: LogMeta, message?: string): void;
};

const levelWeight: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const configuredLevel = normalizeLogLevel(process.env.LOG_LEVEL);
const isProduction = process.env.NODE_ENV === 'production';

function normalizeLogLevel(value: string | undefined): LogLevel {
    return value === 'debug' || value === 'warn' || value === 'error' ? value : 'info';
}

function serializeError(value: unknown): unknown {
    if (!(value instanceof Error)) return value;
    return {
        name: value.name,
        message: value.message,
        stack: value.stack,
    };
}

function normalizeMeta(meta: LogMeta | undefined): LogMeta | undefined {
    if (!meta) return undefined;
    return Object.fromEntries(
        Object.entries(meta).map(([key, value]) => [key, key === 'err' ? serializeError(value) : value])
    );
}

function write(level: LogLevel, first: string | LogMeta, second?: string): void {
    if (levelWeight[level] < levelWeight[configuredLevel]) return;

    const message = typeof first === 'string' ? first : (second || '');
    const meta = typeof first === 'string' ? undefined : normalizeMeta(first);

    if (isProduction) {
        console.log(JSON.stringify({ level, time: new Date().toISOString(), msg: message, ...meta }));
        return;
    }

    const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (meta) {
        sink(`[${level}] ${message}`, meta);
        return;
    }
    sink(`[${level}] ${message}`);
}

function createLogMethod(level: LogLevel): LogMethod {
    return ((first: string | LogMeta, second?: string) => write(level, first, second)) as LogMethod;
}

export const logger = {
    debug: createLogMethod('debug'),
    info: createLogMethod('info'),
    warn: createLogMethod('warn'),
    error: createLogMethod('error'),
};
