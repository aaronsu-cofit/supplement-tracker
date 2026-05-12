import { FastifyInstance } from 'fastify';

/**
 * 註冊請求日誌記錄中間件
 * Fastify 已通過內置 logger 支持，此函數用於自定義日誌級別
 */
export function registerLoggerMiddleware(app: FastifyInstance) {
  // Fastify 的內置日誌記錄已通過 src/config/fastify.ts 配置
  // 這個函數保留用於將來自定義日誌邏輯

  // 可選：添加自定義日誌攔截器
  app.addHook('preHandler', async (request, reply) => {
    request.log.debug(
      {
        method: request.method,
        url: request.url,
        query: request.query,
      },
      'incoming request',
    );
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.debug(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'request completed',
    );
  });

  // 記錄請求體（僅在開發環境）
  if (process.env.NODE_ENV !== 'production') {
    app.addHook('preHandler', async (request, reply) => {
      if (request.body && Object.keys(request.body).length > 0) {
        // 過濾敏感信息
        const sanitizedBody = sanitizeLogData(request.body);
        request.log.debug(
          {
            body: sanitizedBody,
          },
          'request body',
        );
      }
    });
  }
}

/**
 * 過濾日誌中的敏感信息
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'authorization',
    'cookie',
    'apiKey',
    'api_key',
  ];

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * 自定義日誌格式化器（可選）
 */
export function createCustomLogger() {
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '{levelLabel} - {msg}',
          },
        }
      : undefined,
  };
}
