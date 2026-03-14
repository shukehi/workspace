class AppError extends Error {
    constructor({
        code,
        status = 500,
        message,
        details = undefined,
        expose = true,
        originalError = undefined,
    }) {
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
