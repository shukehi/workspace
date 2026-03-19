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
 * 统一包裹为 { success: true, data } 结构。
 * 前端 normalizeApiEnvelope 会自动解包 data 字段。
 */
export function sendSuccess(res: Response, data: unknown, status = 200) {
    return res.status(status).json({ success: true, data });
}

/**
 * 发送创建成功响应 (201)
 */
export function sendCreated(res: Response, data: unknown) {
    return sendSuccess(res, data, 201);
}

