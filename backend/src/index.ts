import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import cron from 'node-cron';
import { runDailyCycle } from './lib/scheduler.js';
import { runReminderCycle } from './lib/reminders.js';

import authRoutes from './routes/auth.js';
import supplementRoutes from './routes/supplements.js';
import woundRoutes from './routes/wounds.js';
import bonesRoutes from './routes/bones.js';
import intimacyRoutes from './routes/intimacy.js';
import hqRoutes from './routes/hq.js';
import analyzeRoutes from './routes/analyze.js';
import checkinsRoutes from './routes/checkins.js';
import notifyRoutes from './routes/notify.js';
import modulesRoutes from './routes/modules.js';
import richmenuRoutes from './routes/richmenu.js';
import lineoaRoutes from './routes/lineoa.js';
import aiRoutes from './routes/ai.js';
import webhookRoutes from './routes/webhook.js';
import wizardRoutes from './routes/wizard.js';
import menuRoutes from './routes/menu.js';
import schedulerRoutes from './routes/scheduler.js';
import womenHealingRoutes from './routes/womenHealing.js';
import productsRoutes from './routes/products.js';
import meRoutes from './routes/me.js';

const app = new Hono();

// ─── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'];

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return origin; // allow non-browser requests
    if (process.env.NODE_ENV !== 'production') return origin; // allow all in dev
    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
}));

// ─── Logger ──────────────────────────────────────────────────────────
app.use('*', logger());

// ─── Health check ────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Routes ──────────────────────────────────────────────────────────
app.route('/api/auth', authRoutes);
app.route('/api/supplements', supplementRoutes);
app.route('/api/checkins', checkinsRoutes);
app.route('/api/wounds', woundRoutes);
app.route('/api/footcare', bonesRoutes);
app.route('/api/intimacy', intimacyRoutes);
app.route('/api/hq', hqRoutes);
app.route('/api/analyze', analyzeRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/notify', notifyRoutes);
app.route('/api/modules', modulesRoutes);
app.route('/api/line/richmenu', richmenuRoutes);
app.route('/api/line/oa', lineoaRoutes);
app.route('/api/wizard', wizardRoutes);
app.route('/api/menu', menuRoutes);
app.route('/api/scheduler', schedulerRoutes);
app.route('/webhook', webhookRoutes);
app.route('/api/women', womenHealingRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/me', meRoutes);

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ─── Start ───────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '8080', 10);
console.log(`🚀 Backend running on port ${port}`);

serve({ fetch: app.fetch, port });

// ─── Daily scheduler cron ────────────────────────────────────────────
// Runs runDailyCycle (push messages + menu re-evaluation) on a cron
// schedule. Defaults to 09:00 Asia/Taipei. Set SCHEDULER_CRON=off to
// disable (e.g., in local dev or tests). Multi-replica safe thanks to
// message_deliveries unique constraint — duplicate fires just skip.
const cronExpr = process.env.SCHEDULER_CRON ?? '0 9 * * *';
const cronTz = process.env.SCHEDULER_TZ ?? 'Asia/Taipei';
if (cronExpr && cronExpr !== 'off') {
  try {
    cron.schedule(
      cronExpr,
      async () => {
        const startedAt = new Date().toISOString();
        console.log(`[cron/scheduler] firing at ${startedAt}`);
        try {
          const result = await runDailyCycle();
          console.log('[cron/scheduler] result', {
            sent: result.sent,
            skipped: result.skipped,
            enrollments: result.enrollmentsConsidered,
            menu: result.menuReeval,
            errorCount: result.errors.length,
          });
        } catch (err) {
          console.error('[cron/scheduler] fatal', err);
        }
      },
      { timezone: cronTz },
    );
    console.log(`🕒 Daily cron scheduled: '${cronExpr}' (${cronTz})`);
  } catch (err) {
    console.error('[cron/scheduler] setup failed', err);
  }
} else {
  console.log('🕒 Daily cron disabled (SCHEDULER_CRON=off)');
}

// ─── Habit reminder cron ─────────────────────────────────────────────
// Every-5-min tick that checks each active daily-habit subscription's
// reminder_time against the user's local clock and pushes a reminder
// through the user's most-recent OA. Idempotent via message_log, so
// multiple replicas / overlapping ticks won't duplicate. Set
// REMINDER_CRON=off to disable (useful locally).
const reminderCronExpr = process.env.REMINDER_CRON ?? '*/5 * * * *';
if (reminderCronExpr && reminderCronExpr !== 'off') {
  try {
    cron.schedule(reminderCronExpr, async () => {
      try {
        const result = await runReminderCycle();
        if (result.sent > 0 || result.errors.length > 0) {
          console.log('[cron/reminder] result', {
            evaluated: result.evaluated,
            sent: result.sent,
            skipped: result.skipped,
            errorCount: result.errors.length,
          });
        }
      } catch (err) {
        console.error('[cron/reminder] fatal', err);
      }
    });
    console.log(`🔔 Reminder cron scheduled: '${reminderCronExpr}'`);
  } catch (err) {
    console.error('[cron/reminder] setup failed', err);
  }
} else {
  console.log('🔔 Reminder cron disabled (REMINDER_CRON=off)');
}
