export {};

const AppError = require('../errors/AppError');
const ERROR_CODES = require('../errors/errorCodes');

interface RequestIssue {
    field: string;
    message: string;
}

interface NormalizedIssue extends RequestIssue {
    target: string;
}

interface ValidatorsMap {
    params?: (value: Record<string, unknown>) => RequestIssue[];
    query?: (value: Record<string, unknown>) => RequestIssue[];
    body?: (value: unknown) => RequestIssue[];
}

function normalizeIssues(issues: RequestIssue[], target: string): NormalizedIssue[] {
    return issues.map((issue) => ({
        target,
        field: issue.field,
        message: issue.message,
    }));
}

function validateRequest(validators: ValidatorsMap = {}) {
    return function requestValidationMiddleware(req: any, res: any, next: (error?: unknown) => unknown) {
        const issues: NormalizedIssue[] = [];

        if (typeof validators.params === 'function') {
            issues.push(...normalizeIssues(validators.params(req.params || {}), 'params'));
        }
        if (typeof validators.query === 'function') {
            issues.push(...normalizeIssues(validators.query(req.query || {}), 'query'));
        }
        if (typeof validators.body === 'function') {
            issues.push(...normalizeIssues(validators.body(req.body), 'body'));
        }

        if (issues.length > 0) {
            return next(new AppError({
                code: ERROR_CODES.VALIDATION_ERROR,
                status: 400,
                details: { issues },
            }));
        }

        return next();
    };
}

module.exports = validateRequest;
