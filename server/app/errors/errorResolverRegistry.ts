import type AppError from './AppError';

/**
 * 错误处理器函数类型
 */
export type ErrorResolver = (error: any) => AppError | null;

/**
 * 错误处理器注册中心
 * 用于解耦全局 normalizeError 与各业务域的特定错误逻辑
 */
class ErrorResolverRegistry {
    private resolvers: Set<ErrorResolver> = new Set();

    /**
     * 注册一个新的错误处理器 (幂等)
     */
    register(resolver: ErrorResolver) {
        this.resolvers.add(resolver);
    }

    /**
     * 清空所有处理器 (主要用于测试环境重置)
     */
    clear() {
        this.resolvers.clear();
    }

    /**
     * 尝试解析错误
     * 按注册顺序调用处理器，返回第一个非空的解析结果
     */
    resolve(error: any): AppError | null {
        for (const resolver of this.resolvers) {
            try {
                const result = resolver(error);
                if (result) return result;
            } catch (e) {
                // 防止某个处理器崩溃导致全局瘫痪
                console.error('[ErrorResolverRegistry] Resolver failed:', e);
            }
        }
        return null;
    }
}

export const errorResolverRegistry = new ErrorResolverRegistry();
export default errorResolverRegistry;
