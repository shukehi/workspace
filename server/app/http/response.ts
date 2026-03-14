import type { Response } from 'express';

/**
 * 标准 API 响应结构
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * 发送成功响应
 */
export function sendSuccess(res: Response, data: unknown, status = 200) {
    return res.status(status).json(data);
}

/**
 * 发送创建成功响应 (201)
 */
export function sendCreated(res: Response, data: unknown) {
    return sendSuccess(res, data, 201);
}

module.exports = {
    sendSuccess,
    sendCreated,
};
