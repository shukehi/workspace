/**
 * API Key 认证中间件
 *
 * 通过请求头 x-api-key 验证访问凭证。
 * - 开发环境（NODE_ENV=development）且未配置 API_KEY 时自动放行，方便本地开发。
 * - 生产/测试环境必须配置 API_KEY，否则拒绝所有请求。
 */

function apiKeyAuth(req, res, next) {
    const apiKey = process.env.API_KEY;

    // 开发环境未配置 key 时直接放行
    if (!apiKey) {
        if (process.env.NODE_ENV !== 'production') return next();
        return res.status(500).json({
            success: false,
            code: 'SERVER_MISCONFIGURATION',
            message: 'API_KEY environment variable is not set',
        });
    }

    const provided = req.headers['x-api-key'];
    if (!provided || provided !== apiKey) {
        return res.status(401).json({
            success: false,
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key',
        });
    }

    next();
}

module.exports = { apiKeyAuth };
