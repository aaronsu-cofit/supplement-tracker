import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';

const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

// 定義 Fastify 實例類型
interface FastifyInstance {
  jwtVerify: any;
}

export async function createFastifyApp() {
  // Fastify 5 需要 logger 配置對象，而非 Pino 實例
  const app = fastify({
    logger: isDev
      ? {
          level: process.env.LOG_LEVEL || 'debug',
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          level: process.env.LOG_LEVEL || 'info',
        },
    disableRequestLogging: false,
    requestTimeout: 30000,
  });

  // ─── 註冊 CORS 插件 ───────────────────────────────────────
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'];

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow non-browser requests
      if (!isProd) return cb(null, true); // allow all in dev
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  // ─── 註冊 Cookie 插件 ────────────────────────────────────
  await app.register(fastifyCookie);

  // ─── 註冊 JWT 插件 ───────────────────────────────────────
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    sign: {
      expiresIn: '365d',
    },
  });

  // ─── 健康檢查路由 ───────────────────────────────────────
  app.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // ─── 404 處理 ────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: 'Not found' });
  });

  return app;
}

export { FastifyInstance };
