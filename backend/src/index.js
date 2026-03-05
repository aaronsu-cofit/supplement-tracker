import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

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

const app = new Hono();

// ─── CORS ────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

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
app.route('/api/notify', notifyRoutes);
app.route('/api/modules', modulesRoutes);

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
