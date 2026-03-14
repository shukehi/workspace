export {};

interface AppErrorOptions {
    code?: string;
    status?: number;
    message?: string;
    details?: unknown;
    expose?: boolean;
    originalError?: unknown;
}

class AppError extends Error {
    code?: string;
    status: number;
    details?: unknown;
    expose: boolean;
    originalError?: unknown;

    constructor({
        code,
        status = 500,
        message,
        details = undefined,
        expose = true,
        originalError = undefined,
    }: AppErrorOptions) {
        super(message || code);
        this.name = 'AppError';
        this.code = code;
        this.status = status;
        this.details = details;
        this.expose = expose;
        this.originalError = originalError;
    }
}

module.exports = AppError;
