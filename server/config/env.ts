import { z } from 'zod';
import { RUNTIME_FILES } from './paths';

/**
 * 环境变量 Zod schema — 启动时校验，确保必填字段存在且格式正确。
 * Environment variable Zod schema — validated at startup.
 */
const envSchema = z.object({
    PORT: z.coerce.number().int().positive().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ERP_BASE_URL: z.string().url().optional(),
    ERP_TIMEOUT: z.coerce.number().int().positive().optional(),
    DB_STORAGE: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues
        .map((i) => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n');
    throw new Error(`[env] Invalid environment variables:\n${issues}`);
}

const env = parsed.data;

/**
 * 类型化的运行时配置
 * Typed runtime configuration
 */
const envConfig = {
    // 服务器配置
    server: {
        port: env.PORT ?? 3000,
        env: env.NODE_ENV,
    },

    // ERP API 配置
    erp: {
        baseUrl: env.ERP_BASE_URL ?? 'http://47.98.198.45:8802',
        timeout: env.ERP_TIMEOUT ?? 30000,
    },

    // 数据库配置
    database: {
        dialect: 'sqlite' as const,
        storage: env.DB_STORAGE ?? RUNTIME_FILES.database,
        logging: env.NODE_ENV === 'development' ? (console.log as typeof console.log) : (false as false),
    },

    // CORS 配置
    cors: {
        origin: env.CORS_ORIGIN
            ? env.CORS_ORIGIN.split(',').map((s) => s.trim())
            : 'http://localhost:5173',
        credentials: true,
    },
} as const;

export default envConfig;
