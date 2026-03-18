/**
 * 结构化日志模块（pino）
 *
 * 开发环境：pino-pretty 格式化输出，易于阅读。
 * 生产环境：JSON 格式，便于日志收集和查询。
 *
 * 日志级别通过环境变量 LOG_LEVEL 控制，默认 'info'。
 */

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(isDev
        ? {
              transport: {
                  target: 'pino-pretty',
                  options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
              },
          }
        : {}),
});

module.exports = { logger };
