// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/fastify-app.ts
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.routes.js';
import { supplementsRoutes } from './routes/supplements.routes.js';
import { woundsRoutes } from './routes/wounds.routes.js';
import { hqRoutes } from './routes/hq.routes.js';
import { intimacyRoutes } from './routes/intimacy.routes.js';
import { schedulerRoutes } from './routes/scheduler.routes.js';
import { aiRoutes } from './routes/ai.routes.js';
import { wizardRoutes } from './routes/wizard.routes.js';
import { footcareRoutes } from './routes/footcare.routes.js';
import { analyzeRoutes } from './routes/analyze.routes.js';
import { checkinsRoutes } from './routes/checkins.routes.js';
import { notifyRoutes } from './routes/notify.routes.js';
import { modulesRoutes } from './routes/modules.routes.js';
import { richmenuRoutes } from './routes/richmenu.routes.js';
import { lineoaRoutes } from './routes/lineoa.routes.js';
import { meRoutes } from './routes/me.routes.js';
import { productsRoutes } from './routes/products.routes.js';
import { questionnaireRoutes } from './routes/questionnaire.routes.js';
import { womenHealingRoutes } from './routes/womenHealing.routes.js';
import { menuRoutes } from './routes/menu.routes.js';
import { webhookRoutes } from './routes/webhook.routes.js';
import { periodRoutes } from './routes/period.routes.js';
import { cycleRoutes } from './routes/cycle.routes.js';
import { registerErrorHandler } from './middleware/errorHandler.js';
import { container } from './lib/container.js';
import { initializeContainer } from './lib/initializeContainer.js';

/**
 * 創建 Fastify 應用實例（MVC 架構）
 * 用於逐步遷移 Hono 路由到 Fastify
 */
export async function createFastifyApp() {
  // ─── DI 容器初始化 ──────────────────────────────────────────────
  initializeContainer(container);
  const app = Fastify({
    logger: process.env.NODE_ENV === 'production'
      ? true
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        },
  });

  // ─── CORS ────────────────────────────────────────────────────────────
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:3005',
        'http://localhost:3006',
      ];

  await app.register(cors, {
    origin: (origin, cb) => {
      // 非瀏覽器請求（無 origin header）
      if (!origin) {
        cb(null, true);
        return;
      }

      // 開發環境允許所有
      if (process.env.NODE_ENV !== 'production') {
        cb(null, true);
        return;
      }

      // 生產環境檢查白名單
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

  // ─── Cookie Plugin ───────────────────────────────────────────────────
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev-secret-change-in-production',
  });

  // ─── Multipart Plugin ────────────────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // ─── DI 容器裝飾器 ──────────────────────────────────────────────────
  // 將容器掛載到 Fastify 實例（用於中間件和路由訪問）
  app.decorate('container', container);

  // ─── Custom Content-Type Parsers ────────────────────────────────────
  // Handle application/json with empty body (e.g., POST with no body)
  app.addContentTypeParser('application/json', async (request: any, payload: any) => {
    const contentLength = request.headers['content-length'];
    if (contentLength === '0' || !contentLength) {
      return {};
    }
    const buffers = [];
    for await (const chunk of payload) {
      buffers.push(chunk);
    }
    const data = Buffer.concat(buffers).toString('utf-8');
    return data ? JSON.parse(data) : {};
  });

  // Fallback parser for requests without Content-Type or with unknown types
  // This regex matches ANY content-type or missing content-type
  // Note: Regex must start with ^ to avoid CORS vulnerability (FSTSEC001)
  app.addContentTypeParser(/^.*/, async (request: any, payload: any) => {
    const contentLength = request.headers['content-length'];
    if (contentLength === '0' || !contentLength) {
      return {};
    }
    try {
      const buffers = [];
      for await (const chunk of payload) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers).toString('utf-8');
      return data ? JSON.parse(data) : {};
    } catch {
      // If JSON parsing fails, return empty object
      return {};
    }
  });

  // ─── Error Handler ───────────────────────────────────────────────────
  registerErrorHandler(app);

  // ─── Health Check ────────────────────────────────────────────────────
  app.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      framework: 'fastify',
    };
  });

  // ─── Routes ──────────────────────────────────────────────────────────
  // 註冊認證路由（MVC 架構）
  await app.register(authRoutes, { prefix: '/api/auth' });

  // 註冊補充品路由（MVC 架構）
  await app.register(supplementsRoutes, { prefix: '/api/supplements' });

  // 註冊傷口管理路由（MVC 架構）
  await app.register(woundsRoutes, { prefix: '/api/wounds' });

  // 註冊 HQ 管理系統路由（MVC 架構）
  await app.register(hqRoutes, { prefix: '/api/hq' });

  // 註冊親密關係評估路由（MVC 架構）
  await app.register(intimacyRoutes, { prefix: '/api/intimacy' });

  // 註冊調度器路由（MVC 架構）
  await app.register(schedulerRoutes, { prefix: '/api/scheduler' });

  // 註冊 AI 路由（MVC 架構）
  await app.register(aiRoutes, { prefix: '/api/ai' });

  // 註冊 Wizard 路由（MVC 架構）
  await app.register(wizardRoutes, { prefix: '/api/wizard' });

  // ─── Task 14: 新遷移的 10 個路由 ──────────────────────────────────────
  // 註冊足部健康管理路由（MVC 架構）
  await app.register(footcareRoutes, { prefix: '/api/footcare' });

  // 註冊圖像分析路由（MVC 架構）
  await app.register(analyzeRoutes, { prefix: '/api/analyze' });

  // 註冊打卡記錄路由（MVC 架構）
  await app.register(checkinsRoutes, { prefix: '/api/checkins' });

  // 註冊通知推送路由（MVC 架構）
  await app.register(notifyRoutes, { prefix: '/api/notify' });

  // 註冊模組管理路由（MVC 架構）
  await app.register(modulesRoutes, { prefix: '/api/modules' });

  // 註冊 LINE Rich Menu 路由（MVC 架構）
  await app.register(richmenuRoutes, { prefix: '/api/line/richmenu' });

  // 註冊 LINE OA 管理路由（MVC 架構）
  await app.register(lineoaRoutes, { prefix: '/api/line/oa' });

  // 註冊用戶個人數據路由（MVC 架構）
  await app.register(meRoutes, { prefix: '/api/me' });

  // 註冊產品管理路由（MVC 架構）
  await app.register(productsRoutes, { prefix: '/api/products' });

  // 註冊問卷路由（MVC 架構）
  await app.register(questionnaireRoutes, { prefix: '/api/questionnaires' });

  // 註冊女性健康療癒路由（MVC 架構）
  await app.register(womenHealingRoutes, { prefix: '/api/women' });

  // 註冊菜單評估路由（MVC 架構）
  await app.register(menuRoutes, { prefix: '/api/menu' });

  // 註冊 LINE 事件 Webhook 路由（MVC 架構）
  await app.register(webhookRoutes, { prefix: '/api/webhook' });

  // 註冊月經週期追蹤路由（MVC 架構）
  await app.register(periodRoutes, { prefix: '/api/periods' });

  // 註冊月經週期設定路由（MVC 架構）
  await app.register(cycleRoutes, { prefix: '/api/cycle' });

  // ─── 404 Handler ─────────────────────────────────────────────────────
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'NotFoundError',
      message: 'Not found',
      path: request.url,
    });
  });

  return app;
}

/**
 * 啟動 Fastify 應用（僅在直接運行此文件時）
 * 用於測試和開發
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.FASTIFY_PORT || '8080', 10);
  const host = process.env.HOST || '0.0.0.0';

  const app = await createFastifyApp();

  try {
    await app.listen({ port, host });
    console.log(`🚀 Fastify server running on http://${host}:${port}`);
    console.log(`📝 Health check: http://${host}:${port}/health`);
    console.log(`🔐 Auth endpoints: http://${host}:${port}/api/auth/*`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
