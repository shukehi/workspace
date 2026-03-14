/**
 * 应用自定义错误类
 */
export class AppError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details: any;
    readonly expose: boolean;
    readonly originalError: any;

    constructor({
        code,
        status = 500,
        message,
        details = {},
        expose = true,
        originalError = null,
    }: {
        code: string;
        status?: number;
        message?: string;
        details?: any;
        expose?: boolean;
        originalError?: any;
    }) {
        super(message || code);
        this.name = 'AppError';
        this.code = code;
        this.status = status;
        this.details = details;
        this.expose = expose;
        this.originalError = originalError;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
export default AppError;
