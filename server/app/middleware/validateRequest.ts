import type { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';
import ERROR_CODES from '../errors/errorCodes';

/**
 * 请求校验问题详情
 */
export interface RequestIssue {
    field: string;
    message: string;
}

/**
 * 带有校验目标的请求问题
 */
export interface NormalizedIssue extends RequestIssue {
    target: string;
}

/**
 * 校验器映射表
 */
export interface ValidatorsMap {
    params?: (value: Record<string, unknown>) => RequestIssue[];
    query?: (value: Record<string, unknown>) => RequestIssue[];
    body?: (value: unknown) => RequestIssue[];
}

/**
 * 标准化校验问题
 */
function normalizeIssues(issues: RequestIssue[], target: string): NormalizedIssue[] {
    return issues.map((issue) => ({
        target,
        field: issue.field,
        message: issue.message,
    }));
}

/**
 * 创建 Express 请求校验中间件
 */
export function validateRequest(validators: ValidatorsMap = {}) {
    return function requestValidationMiddleware(req: Request, res: Response, next: NextFunction) {
        const issues: NormalizedIssue[] = [];

        if (typeof validators.params === 'function') {
            issues.push(...normalizeIssues(validators.params(req.params as Record<string, unknown> || {}), 'params'));
        }
        if (typeof validators.query === 'function') {
            issues.push(...normalizeIssues(validators.query(req.query as Record<string, unknown> || {}), 'query'));
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
