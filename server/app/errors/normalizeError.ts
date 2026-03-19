import AppError from './AppError';
import ERROR_CODES from './errorCodes';
import { errorResolverRegistry } from './errorResolverRegistry';
import type { PlainRecord } from '../../shared/types';

// 标记是否已经初始化过领域处理器，防止在 normalizeError 内部产生循环引用
let isInitialized = false;

/**
 * 确保领域错误处理器已加载 (懒加载机制)
 * 解决测试环境不经过 server/index.js 启动的问题
 */
function ensureInitialized() {
    if (isInitialized) return;
    isInitialized = true;
    try {
        // 使用 require 动态引入以避免顶层循环依赖
        const { initErrorSystem } = require('./init');
        initErrorSystem();
    } catch (e) {
        console.error('[normalizeError] Failed to auto-initialize error system:', e);
    }
}

/**
 * 基础通用错误解析 (作为保底)
 */
function fromGenericCode(error: PlainRecord): AppError | null {
    if (!error?.code) return null;

    switch (error.code) {
    case ERROR_CODES.INVALID_ID:
        return new AppError({
            code: ERROR_CODES.INVALID_ID,
            status: 400,
            message: 'Invalid order id', // 恢复原有的特定消息
            details: { message: 'Invalid order id' },
            originalError: error,
        });
    case ERROR_CODES.NOT_FOUND:
        return new AppError({
            code: ERROR_CODES.NOT_FOUND,
            status: 404,
            message: error.message || 'Not found',
            details: { message: error.message || 'Not found' },
            originalError: error,
        });
    default:
        return null;
    }
}

/**
 * 标准化未知错误为标准 AppError
 * 该函数通过 errorResolverRegistry 实现业务领域的完全解耦
 */
export function normalizeError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    const errorRecord = (error || {}) as PlainRecord;

    // 自动确保领域策略已注册
    ensureInitialized();

    // 1. 尝试通过业务域注册中心解析
    const domainResolved = errorResolverRegistry.resolve(errorRecord);
    if (domainResolved) return domainResolved;

    // 2. 尝试通用解析
    const genericResolved = fromGenericCode(errorRecord);
    if (genericResolved) return genericResolved;

    // 3. 处理 Sequelize 校验错误 (底层 ORM 行为，保留在核心层)
    if (errorRecord?.name === 'SequelizeValidationError') {
        return new AppError({
            code: ERROR_CODES.VALIDATION_ERROR,
            status: 400,
            details: {
                issues: Array.isArray(errorRecord.errors)
                    ? errorRecord.errors.map((item: PlainRecord) => ({
                        message: item.message,
                        path: item.path,
                    }))
                    : [],
            },
            originalError: error,
        });
    }

    // 4. 默认回退到内部服务器错误 (500)
    return new AppError({
        code: ERROR_CODES.INTERNAL_ERROR,
        status: 500,
        message: errorRecord?.message || ERROR_CODES.INTERNAL_ERROR,
        expose: false,
        originalError: error,
    });
}

export default normalizeError;
