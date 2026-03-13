const AppError = require('../errors/AppError');
const ERROR_CODES = require('../errors/errorCodes');

function normalizeIssues(issues, target) {
    return issues.map((issue) => ({
        target,
        field: issue.field,
        message: issue.message,
    }));
}

function validateRequest(validators = {}) {
    return function requestValidationMiddleware(req, res, next) {
        const issues = [];

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
