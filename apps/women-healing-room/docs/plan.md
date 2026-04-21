# Women Healing Room — Backend Integration & Mood Diary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Prisma + API to shared backend (Hono), add LINE LIFF auth to all pages, and implement a full mood diary feature with daily check-in, AI feedback, and history view.

**Architecture:** women-healing-room (Next.js port 3006) → `apiFetch()` from `@vitera/lib` → backend (Hono, port 4000) → Prisma → PostgreSQL. All AI (Gemini) calls move to backend routes. Frontend auth handled by `AppLayout lineOnly` from `@vitera/lib`.

**Tech Stack:** Hono (backend), Prisma 5, `@google/generative-ai`, Next.js 16, React 19, Tailwind CSS v4, `@vitera/lib` (AppLayout, apiFetch)

---

## File Map

### Backend (create/modify)
| Action | File |
|--------|------|
| Modify | `backend/prisma/schema.prisma` |
| Create | `backend/src/lib/womenHealingDb.ts` |
| Create | `backend/src/routes/womenHealing.ts` |
| Modify | `backend/src/index.ts` |

### Frontend women-healing-room (create/modify/delete)
| Action | File |
|--------|------|
| Modify | `apps/women-healing-room/package.json` |
| Modify | `apps/women-healing-room/src/app/layout.tsx` |
| Create | `apps/women-healing-room/src/app/ClientLayout.tsx` |
| Modify | `apps/women-healing-room/src/app/assessment/photo/page.tsx` |
| Modify | `apps/women-healing-room/src/app/assessment/page.tsx` |
| Rewrite | `apps/women-healing-room/src/app/progress/page.tsx` |
| Create | `apps/women-healing-room/src/app/progress/history/page.tsx` |
| Delete | `apps/women-healing-room/src/app/api/` (entire folder) |
| Delete | `apps/women-healing-room/prisma/` (entire folder) |

---

## Task 1: Add Prisma Models to Backend Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add three new models to the schema**

Open `backend/prisma/schema.prisma`. Add the following after the last existing model, and add the new relations to the User model:

```prisma
// At the bottom of schema.prisma, add:

model DiaryEntry {
  id         String   @id @default(cuid())
  userId     String   @db.VarChar(64)
  date       DateTime @db.Date
  mood       Int
  sleep      Int
  diary      String?  @db.Text
  aiFeedback String?  @db.Text
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, date])
  @@index([userId], name: "idx_diary_entries_user")
  @@map("diary_entries")
}

model ReliefSession {
  id          String     @id @default(cuid())
  userId      String     @db.VarChar(64)
  type        ReliefType
  durationSec Int
  completedAt DateTime   @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId], name: "idx_relief_sessions_user")
  @@map("relief_sessions")
}

model AssessmentResult {
  id          String   @id @default(cuid())
  userId      String   @db.VarChar(64)
  resultType  String   @db.VarChar(1)
  scores      Json
  aiAnalysis  Json
  faceInsight String?  @db.Text
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId], name: "idx_assessment_results_user")
  @@map("assessment_results")
}

enum ReliefType {
  BREATHING
  BODY_SCAN
  SLEEP_QUOTES
}
```

Also add the three relations to the `User` model block (inside the existing `model User { ... }`):

```prisma
  diaryEntries      DiaryEntry[]
  reliefSessions    ReliefSession[]
  assessmentResults AssessmentResult[]
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/aaron_su/Github/Vitera
pnpm --filter @vitera/backend prisma migrate dev --name add-women-healing-room
```

Expected output: `The following migration(s) have been created and applied...`

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(backend): add DiaryEntry, ReliefSession, AssessmentResult models"
```

---

## Task 2: Create Backend DB Helpers

**Files:**
- Create: `backend/src/lib/womenHealingDb.ts`

- [ ] **Step 1: Create the DB helper file**

```typescript
// backend/src/lib/womenHealingDb.ts
import { db } from './db.js';
import type { ReliefType } from '@prisma/client';

// Returns today's date at midnight (Taiwan timezone UTC+8)
function getTaiwanToday(): Date {
  const now = new Date();
  const taiwanDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }); // "2026-04-20"
  return new Date(taiwanDateStr + 'T00:00:00.000Z');
}

export async function getTodayDiary(userId: string) {
  const today = getTaiwanToday();
  return db().diaryEntry.findUnique({
    where: { userId_date: { userId, date: today } },
  });
}

export interface UpsertDiaryInput {
  mood: number;
  sleep: number;
  diary?: string;
  aiFeedback?: string;
}

export async function upsertDiaryEntry(userId: string, input: UpsertDiaryInput) {
  const today = getTaiwanToday();
  return db().diaryEntry.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      mood: input.mood,
      sleep: input.sleep,
      diary: input.diary ?? null,
      aiFeedback: input.aiFeedback ?? null,
    },
    update: {
      mood: input.mood,
      sleep: input.sleep,
      diary: input.diary ?? null,
      aiFeedback: input.aiFeedback ?? null,
    },
  });
}

export async function getDiaryEntries(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    db().diaryEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    db().diaryEntry.count({ where: { userId } }),
  ]);
  return { entries, total, hasMore: skip + entries.length < total };
}

export interface SaveAssessmentInput {
  resultType: string;
  scores: { A: number; B: number; C: number };
  aiAnalysis: object;
  faceInsight?: string;
}

export async function saveAssessmentResult(userId: string, input: SaveAssessmentInput) {
  return db().assessmentResult.create({
    data: {
      userId,
      resultType: input.resultType,
      scores: input.scores,
      aiAnalysis: input.aiAnalysis,
      faceInsight: input.faceInsight ?? null,
    },
  });
}

export interface SaveReliefInput {
  type: ReliefType;
  durationSec: number;
}

export async function saveReliefSession(userId: string, input: SaveReliefInput) {
  return db().reliefSession.create({
    data: {
      userId,
      type: input.type,
      durationSec: input.durationSec,
    },
  });
}
```

Note: `db()` is the existing Prisma singleton from `backend/src/lib/db.ts`.

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/aaron_su/Github/Vitera
pnpm --filter @vitera/backend build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/womenHealingDb.ts
git commit -m "feat(backend): add women healing room DB helpers"
```

---

## Task 3: Create Backend Hono Route

**Files:**
- Create: `backend/src/routes/womenHealing.ts`

- [ ] **Step 1: Create the route file**

```typescript
// backend/src/routes/womenHealing.ts
import { Hono } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getTodayDiary,
  upsertDiaryEntry,
  getDiaryEntries,
  saveAssessmentResult,
  saveReliefSession,
} from '../lib/womenHealingDb.js';
import type { HonoEnv } from '../types.js';

const router = new Hono<HonoEnv>();
router.use('*', authMiddleware);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = 'gemini-3.1-flash-lite-preview';

// ─── Diary ────────────────────────────────────────────────────────────────────

// GET /api/women/diary/today
router.get('/diary/today', async (c) => {
  const userId = c.get('userId');
  const entry = await getTodayDiary(userId);
  return c.json(entry ?? null);
});

// GET /api/women/diary?page=1&limit=20
router.get('/diary', async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const limit = parseInt(c.req.query('limit') ?? '20', 10);
  const result = await getDiaryEntries(userId, page, Math.min(limit, 50));
  return c.json(result);
});

// POST /api/women/diary — upsert today's entry + generate AI feedback
router.post('/diary', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ mood: number; sleep: number; diary?: string }>();

  if (!body.mood || !body.sleep) {
    return c.json({ error: '缺少 mood 或 sleep 欄位' }, 400);
  }

  const moodLabels = ['', '極差', '偏低', '普通', '不錯', '極佳'];
  const sleepLabels = ['', '極差', '難入眠', '普通', '穩定', '深層'];

  let aiFeedback: string;
  try {
    const prompt = `你是「女人療心室」的 AI 心理支持助理，專門陪伴前更年期女性走過情緒波動、睡眠困擾與身體不適。

【今日用戶數據】
- 情緒評分：${body.mood}/5（${moodLabels[body.mood]}）
- 睡眠評分：${body.sleep}/5（${sleepLabels[body.sleep]}）
- 日記內容：「${body.diary || '（今天沒有額外文字記錄）'}」

請根據以上資訊，以溫柔、貼心、非評判性的語氣，用繁體中文撰寫一段 80-120 字的回應。
要讓她感到被真正理解與支持，並針對她的具體情況給一個溫和、可行的小建議。
使用自然的段落，不要條列式。不要過於制式化，要像朋友般真誠。`;

    const model = genAI.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    aiFeedback = result.response.text();
  } catch {
    aiFeedback = localFallback(body.diary ?? '', body.mood, body.sleep);
  }

  const entry = await upsertDiaryEntry(userId, {
    mood: body.mood,
    sleep: body.sleep,
    diary: body.diary,
    aiFeedback,
  });

  return c.json(entry);
});

// ─── Assessment ───────────────────────────────────────────────────────────────

// POST /api/women/assessment/scan
router.post('/assessment/scan', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ imageBase64?: string }>();

  try {
    const prompt = `你是一位身心健康分析師，專門協助前更年期女性了解自身狀態。
請觀察這張臉部照片，從以下角度進行健康觀察（這是健康輔助工具，非醫療診斷）：
- 眼周氣色與暗沉程度
- 整體膚況與均勻度
- 面部肌肉張力（如眉間、嘴角）
- 整體氣色與精神狀態

請用溫柔、專業的繁體中文，撰寫一段 80-100 字的自然段落描述，不要使用條列式。
若圖片不清晰或無法辨識臉部，請根據前更年期女性常見壓力表徵提供一般性描述。`;

    const model = genAI.getGenerativeModel({ model: MODEL });
    const parts = body.imageBase64
      ? [prompt, { inlineData: { mimeType: 'image/jpeg' as const, data: body.imageBase64 } }]
      : [prompt];

    const result = await model.generateContent(parts);
    return c.json({ insight: result.response.text() });
  } catch (err) {
    console.error('Scan error:', err);
    return c.json({ insight: '' }, 200); // Return empty string instead of error so UX continues
  }
});

// POST /api/women/assessment/analyze
router.post('/assessment/analyze', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{
    scores: { A: number; B: number; C: number };
    scanInsight: string;
    answers: Array<{ question: string; selected: string; type: string }>;
  }>();

  const { scores, scanInsight, answers } = body;

  function determineType(s: { A: number; B: number; C: number }): 'A' | 'B' | 'C' {
    if (s.B > s.A && s.B > s.C) return 'B';
    if (s.C > s.A && s.C > s.B) return 'C';
    return 'A';
  }
  const resultType = determineType(scores);

  const typeLabels = {
    A: '神經緊繃型（腦袋停不下來）',
    B: '情緒波動型（心情起伏大）',
    C: '身心失衡型（生理不適明顯）',
  };

  const answersText = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\n→ ${a.selected}`)
    .join('\n\n');

  try {
    const prompt = `你是一位專業的前更年期身心健康顧問，請根據以下資訊，為這位女性生成個人化的健康評估報告。

【評估類型】${typeLabels[resultType]}
【各維度得分】A型: ${scores.A}分 / B型: ${scores.B}分 / C型: ${scores.C}分

【問卷作答詳情】
${answersText}

【臉部觀察分析】
${scanInsight || '（本次未進行臉部掃描）'}

請以 JSON 格式回覆，包含以下欄位，使用溫柔、具支持感的繁體中文：
{
  "type": "${resultType}",
  "title": "類型名稱（15字以內，要有特色）",
  "description": "根據她的具體作答，描述她目前的身心狀態（120-150字，要有個人化細節）",
  "advice": "針對她的狀況給出具體的生活建議（80-100字）",
  "faceInsight": "整合臉部分析與類型特徵的說明（60-80字）",
  "nutrition": "針對此類型的營養素補充建議（60-80字，要有具體的補充品名稱與說明）",
  "courseTitle": "最適合她的課程名稱（可參考：好眠正念課、情緒安定課、荷爾蒙重整課）"
}`;

    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());

    // Save to DB (fire-and-forget)
    saveAssessmentResult(userId, {
      resultType,
      scores,
      aiAnalysis: analysis,
      faceInsight: scanInsight,
    }).catch(console.error);

    return c.json(analysis);
  } catch (err) {
    console.error('Analyze error:', err);
    return c.json({ error: '分析失敗' }, 500);
  }
});

// ─── Relief ───────────────────────────────────────────────────────────────────

// POST /api/women/relief
router.post('/relief', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ type: 'BREATHING' | 'BODY_SCAN' | 'SLEEP_QUOTES'; durationSec: number }>();
  if (!body.type) return c.json({ error: '缺少 type 欄位' }, 400);
  const session = await saveReliefSession(userId, {
    type: body.type,
    durationSec: body.durationSec ?? 0,
  });
  return c.json(session, 201);
});

// ─── Fallback ─────────────────────────────────────────────────────────────────

function localFallback(text: string, mood: number, sleep: number): string {
  const keywords = {
    grief: ['狗', '貓', '寵物', '走', '離', '離世', '過世', '死', '不見', '痛', '想念'],
    burnout: ['累', '疲', '煩', '壓力', '忙', '喘不過氣', '無力', '工作'],
    anger: ['氣', '怒', '不爽', '討厭', '恨', '生氣', '火', '爆炸'],
    body: ['熱', '汗', '痛', '不舒服', '病', '暈', '燥', '盜汗', '心悸'],
  };
  if (keywords.grief.some((k) => text.includes(k)))
    return '面對摯愛的離開，那種深沉的痛與失落是無法用言語簡單形容的。允許自己悲傷，不需要急著好起來... 這段時間請溫柔地陪著自己。';
  if (keywords.burnout.some((k) => text.includes(k)))
    return '看來最近真的承擔了太多壓力呢。大腦和身體都在發出罷工的警訊，今天的妳已經足夠努力了，現在請把重擔暫時放下。';
  if (keywords.anger.some((k) => text.includes(k)))
    return '感到生氣和煩躁是完全可以被接受的！目前荷爾蒙波動讓神經系統變得異常敏感，試著透過深呼吸，把體內的濁氣吐出來。';
  if (keywords.body.some((k) => text.includes(k)))
    return '身體的種種不適，確實會讓人感到沮喪無力。請給她多一點耐心與包容，等一下去喝杯溫熱的水，做點輕柔的伸展吧。';
  if (mood <= 2)
    return '今天的心情似乎有些低落。能誠實地記錄下來，就是照顧自己最好的第一步！偶爾在谷底休息一下也是必要的，想哭就哭吧。';
  if (sleep <= 2)
    return '昨晚沒睡好，今天白天一定特別疲憊吧... 今晚試著去「線上舒緩區」使用引導工具，給自己一個不受打擾的睡眠儀式。';
  return '謝謝妳願意分享這些心裡的聲音。每一天的觀察與書寫，都能幫助妳更拿回情緒的主導權。今晚好好睡一覺吧，晚安。';
}

export default router;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/aaron_su/Github/Vitera
pnpm --filter @vitera/backend build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/womenHealing.ts
git commit -m "feat(backend): add women healing room Hono routes (diary, assessment, relief)"
```

---

## Task 4: Register Route + Update CORS in Backend Index

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add import and route registration**

In `backend/src/index.ts`, add the import with the other route imports:

```typescript
import womenHealingRoutes from './routes/womenHealing.js';
```

Then add the route registration with the other `app.route(...)` calls:

```typescript
app.route('/api/women', womenHealingRoutes);
```

- [ ] **Step 2: Add port 3006 to the default allowed origins array**

Find the `allowedOrigins` array in `backend/src/index.ts`. The current value is:
```typescript
: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];
```

Change it to:
```typescript
: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'];
```

- [ ] **Step 3: Add GEMINI_API_KEY to backend .env**

Open `backend/.env` (or `.env.local`) and add (if not already present):
```
GEMINI_API_KEY=<your Gemini API key>
```

- [ ] **Step 4: Start backend and test health endpoint**

```bash
cd /Users/aaron_su/Github/Vitera
pnpm --filter @vitera/backend dev &
curl http://localhost:4000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(backend): register womenHealing routes and add port 3006 to CORS"
```

---

## Task 5: Update women-healing-room Dependencies

**Files:**
- Modify: `apps/women-healing-room/package.json`

- [ ] **Step 1: Update package.json**

In `apps/women-healing-room/package.json`, make these changes to `"dependencies"`:

Remove `"@google/generative-ai": "^0.21.0"` and add `"@vitera/lib": "workspace:*"`:

```json
{
  "name": "@vitera/women-healing-room",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3006",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@vitera/lib": "workspace:*",
    "next": "16.2.2",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/aaron_su/Github/Vitera
pnpm install
```

Expected: `@vitera/lib` is now linked.

- [ ] **Step 3: Add env vars to .env.local**

Create or update `apps/women-healing-room/.env.local`:
```
NEXT_PUBLIC_LIFF_ID=<your LINE LIFF ID for this app>
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- [ ] **Step 4: Commit**

```bash
git add apps/women-healing-room/package.json pnpm-lock.yaml
git commit -m "feat(women-healing-room): add @vitera/lib dep, remove @google/generative-ai"
```

---

## Task 6: Add LINE LIFF Auth to App Layout

**Files:**
- Modify: `apps/women-healing-room/src/app/layout.tsx`
- Create: `apps/women-healing-room/src/app/ClientLayout.tsx`

- [ ] **Step 1: Create ClientLayout.tsx**

```typescript
// apps/women-healing-room/src/app/ClientLayout.tsx
'use client';

import { AppLayout } from '@vitera/lib';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout lineOnly>
      <main className="mobile-container">
        {children}
      </main>
    </AppLayout>
  );
}
```

- [ ] **Step 2: Update layout.tsx to use ClientLayout**

Replace the entire content of `apps/women-healing-room/src/app/layout.tsx` with:

```typescript
import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'Cofit 女人療心室',
  description: '針對前更年期女性設計的身心整合支持工具，提供 AI 情緒評估、舒緩練習與專業線上課程，與鄧雯心醫師一起找回安定的自己。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Start dev server and verify auth redirect**

```bash
cd /Users/aaron_su/Github/Vitera
pnpm --filter @vitera/women-healing-room dev
```

Open http://localhost:3006 in a browser. Without LIFF environment, expect either a login redirect or the page to load depending on `AuthGuard` behavior with `lineOnly`.

- [ ] **Step 4: Commit**

```bash
git add apps/women-healing-room/src/app/layout.tsx apps/women-healing-room/src/app/ClientLayout.tsx
git commit -m "feat(women-healing-room): add LINE LIFF auth via AppLayout lineOnly"
```

---

## Task 7: Delete Old API Routes and Prisma Folder

**Files:**
- Delete: `apps/women-healing-room/src/app/api/`
- Delete: `apps/women-healing-room/prisma/`

- [ ] **Step 1: Delete old API folder**

```bash
rm -rf /Users/aaron_su/Github/Vitera/apps/women-healing-room/src/app/api
```

- [ ] **Step 2: Delete old prisma folder**

```bash
rm -rf /Users/aaron_su/Github/Vitera/apps/women-healing-room/prisma
```

- [ ] **Step 3: Verify build still compiles**

```bash
cd /Users/aaron_su/Github/Vitera
pnpm --filter @vitera/women-healing-room build
```

Expected: build succeeds (no imports of deleted files).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(women-healing-room): remove local API routes and Prisma (moved to backend)"
```

---

## Task 8: Update Assessment Pages to Use apiFetch

**Files:**
- Modify: `apps/women-healing-room/src/app/assessment/photo/page.tsx`
- Modify: `apps/women-healing-room/src/app/assessment/page.tsx`

- [ ] **Step 1: Update photo/page.tsx — replace fetch with apiFetch**

At the top of `apps/women-healing-room/src/app/assessment/photo/page.tsx`, add the import after the existing imports:

```typescript
import { apiFetch } from '@vitera/lib';
```

Then find this block (lines 69–81) and replace it:

**Old:**
```typescript
    const apiCall = (async () => {
      try {
        const res = await fetch("/api/assessment/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        sessionStorage.setItem("scanInsight", data.insight || "");
      } catch {
        sessionStorage.setItem("scanInsight", "");
      }
    })();
```

**New:**
```typescript
    const apiCall = (async () => {
      try {
        const res = await apiFetch("/api/women/assessment/scan", {
          method: "POST",
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        sessionStorage.setItem("scanInsight", data.insight || "");
      } catch {
        sessionStorage.setItem("scanInsight", "");
      }
    })();
```

- [ ] **Step 2: Update assessment/page.tsx — replace fetch with apiFetch**

At the top of `apps/women-healing-room/src/app/assessment/page.tsx`, add the import after the existing imports:

```typescript
import { apiFetch } from '@vitera/lib';
```

Then find this block (lines 113–120) and replace it:

**Old:**
```typescript
        const res = await fetch("/api/assessment/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores: newScores, scanInsight, answers: newAnswers }),
        });
```

**New:**
```typescript
        const res = await apiFetch("/api/women/assessment/analyze", {
          method: "POST",
          body: JSON.stringify({ scores: newScores, scanInsight, answers: newAnswers }),
        });
```

- [ ] **Step 3: Commit**

```bash
git add apps/women-healing-room/src/app/assessment/photo/page.tsx apps/women-healing-room/src/app/assessment/page.tsx
git commit -m "feat(women-healing-room): update assessment pages to call backend via apiFetch"
```

---

## Task 9: Rewrite Progress Page (Today's Check-in + 7-Day Chart)

**Files:**
- Rewrite: `apps/women-healing-room/src/app/progress/page.tsx`

- [ ] **Step 1: Replace entire file content**

```typescript
// apps/women-healing-room/src/app/progress/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';

const MOOD_EMOJIS = [
  { val: 1, label: '極差', emoji: '😭' },
  { val: 2, label: '偏低', emoji: '🥺' },
  { val: 3, label: '普通', emoji: '😐' },
  { val: 4, label: '不錯', emoji: '🙂' },
  { val: 5, label: '極佳', emoji: '🤩' },
];

const SLEEP_EMOJIS = [
  { val: 1, label: '極差', emoji: '😫' },
  { val: 2, label: '難入眠', emoji: '🥱' },
  { val: 3, label: '普通', emoji: '😐' },
  { val: 4, label: '穩定', emoji: '😴' },
  { val: 5, label: '深層', emoji: '🛌' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface DiaryEntry {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  diary: string | null;
  aiFeedback: string | null;
}

// Generate last N dates as "YYYY-MM-DD" strings in Taiwan timezone
function getLastNDates(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }));
  }
  return dates;
}

export default function ProgressPage() {
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [diaryText, setDiaryText] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [chartEntries, setChartEntries] = useState<DiaryEntry[]>([]);

  // Load today's entry and 7-day chart data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [todayRes, chartRes] = await Promise.all([
          apiFetch('/api/women/diary/today'),
          apiFetch('/api/women/diary?limit=7'),
        ]);
        if (todayRes.ok) {
          const today: DiaryEntry | null = await todayRes.json();
          if (today) {
            setMood(today.mood);
            setSleep(today.sleep);
            setDiaryText(today.diary ?? '');
            setAiFeedback(today.aiFeedback ? `「${today.aiFeedback}」` : '');
            setIsSaved(true);
          }
        }
        if (chartRes.ok) {
          const { entries } = await chartRes.json();
          setChartEntries(entries);
        }
      } finally {
        setIsLoadingToday(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!mood || !sleep) {
      alert('請完成今日的情緒與睡眠評分喔！');
      return;
    }
    setIsSaved(true);
    setIsAnalyzing(true);
    setAiFeedback('');

    try {
      const res = await apiFetch('/api/women/diary', {
        method: 'POST',
        body: JSON.stringify({ mood, sleep, diary: diaryText }),
      });
      if (!res.ok) throw new Error('API error');
      const entry: DiaryEntry = await res.json();
      setAiFeedback(entry.aiFeedback ? `「${entry.aiFeedback}」` : '');
      // Refresh chart
      const chartRes = await apiFetch('/api/women/diary?limit=7');
      if (chartRes.ok) {
        const { entries } = await chartRes.json();
        setChartEntries(entries);
      }
    } catch {
      setAiFeedback('「謝謝妳願意記錄今天的心情。每一天的書寫，都是對自己最好的陪伴。」');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Build 7-day chart data: last 7 dates with entry data if available
  const last7Dates = getLastNDates(7);
  const entryByDate = Object.fromEntries(chartEntries.map((e) => [e.date.split('T')[0], e]));
  const chartData = last7Dates.map((dateStr) => ({
    dateStr,
    label: WEEKDAYS[new Date(dateStr + 'T12:00:00').getDay()],
    entry: entryByDate[dateStr] ?? null,
  }));

  if (isLoadingToday) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FA] to-[#E8F7F8] pb-8">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link href="/" className="text-[#4A5D6E] text-sm font-medium">← 返回</Link>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[#1E293B]">我的安定進度</h1>
          <p className="text-xs text-[#64748B] mt-0.5">每天記錄一點點，看見自己的變化</p>
        </div>
        <div className="w-10" />
      </header>

      <div className="px-4 space-y-4">
        {/* Check-in Section */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-[#1E293B] mb-4">📅 今日狀態打卡</h2>

          {/* Mood */}
          <div className="mb-4">
            <p className="text-sm text-[#64748B] mb-2">現在的情緒狀態如何？</p>
            <div className="flex justify-between">
              {MOOD_EMOJIS.map((item) => (
                <button
                  key={item.val}
                  onClick={() => !isSaved && setMood(item.val)}
                  disabled={isSaved}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    mood === item.val
                      ? 'bg-[#DCE8EF] scale-110 shadow-sm'
                      : 'hover:bg-[#F0F6FA]'
                  } ${isSaved ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] text-[#64748B]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sleep */}
          <div className="mb-4">
            <p className="text-sm text-[#64748B] mb-2">昨晚的睡眠品質如何？</p>
            <div className="flex justify-between">
              {SLEEP_EMOJIS.map((item) => (
                <button
                  key={item.val}
                  onClick={() => !isSaved && setSleep(item.val)}
                  disabled={isSaved}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    sleep === item.val
                      ? 'bg-[#E1F4F5] scale-110 shadow-sm'
                      : 'hover:bg-[#F0F6FA]'
                  } ${isSaved ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[10px] text-[#64748B]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Diary */}
          <div className="mb-4">
            <p className="text-sm text-[#64748B] mb-2">有什麼想對自己說的嗎？(AI 小日記)</p>
            <textarea
              value={diaryText}
              onChange={(e) => setDiaryText(e.target.value)}
              disabled={isSaved}
              placeholder="寫下今天的開心、煩躁、身體不適，或是任何想抒發的心情..."
              className="w-full rounded-xl border border-[#DCE8EF] bg-[#F8FBFD] px-4 py-3 text-sm text-[#334155] placeholder-[#94A3B8] resize-none focus:outline-none focus:border-[#4A5D6E] disabled:opacity-70 disabled:cursor-default"
              rows={3}
            />
          </div>

          {!isSaved ? (
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-[#4A5D6E] text-white text-sm font-medium hover:bg-[#3d4f5e] transition-colors"
            >
              儲存紀錄並獲取 AI 分析
            </button>
          ) : (
            <div className="text-center text-sm text-[#4A5D6E] font-medium py-2">
              ✅ 今日紀錄已完成
            </div>
          )}
        </section>

        {/* AI Analyzing */}
        {isAnalyzing && (
          <section className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm text-[#64748B]">AI 正在生成專屬回覆...</span>
          </section>
        )}

        {/* AI Feedback */}
        {aiFeedback && !isAnalyzing && (
          <section className="bg-gradient-to-br from-[#DCE8EF] to-[#E1F4F5] rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">✨</span>
              <div>
                <p className="text-xs font-medium text-[#4A5D6E] mb-1">女人療心室給妳的悄悄話</p>
                <p className="text-sm text-[#334155] leading-relaxed">{aiFeedback}</p>
              </div>
            </div>
          </section>
        )}

        {/* 7-Day Chart */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#1E293B]">📊 最近 7 天趨勢</h2>
            <Link href="/progress/history" className="text-xs text-[#4A5D6E] font-medium">
              查看完整歷史 →
            </Link>
          </div>

          <div className="flex items-end justify-between gap-1 h-24">
            {chartData.map(({ dateStr, label, entry }) => (
              <div key={dateStr} className="flex flex-col items-center gap-1 flex-1">
                <div className="flex gap-0.5 items-end h-16">
                  {/* Mood bar */}
                  <div className="w-3 bg-[#E2E8F0] rounded-t-sm overflow-hidden flex items-end">
                    {entry && (
                      <div
                        className="w-full bg-[#4A5D6E] rounded-t-sm transition-all"
                        style={{ height: `${(entry.mood / 5) * 100}%` }}
                      />
                    )}
                  </div>
                  {/* Sleep bar */}
                  <div className="w-3 bg-[#E2E8F0] rounded-t-sm overflow-hidden flex items-end">
                    {entry && (
                      <div
                        className="w-full bg-[#7ABFBF] rounded-t-sm transition-all"
                        style={{ height: `${(entry.sleep / 5) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8]">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#4A5D6E]" />
              <span className="text-[10px] text-[#64748B]">情緒</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#7ABFBF]" />
              <span className="text-[10px] text-[#64748B]">睡眠</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify page loads and today's entry is fetched**

With the backend running, open http://localhost:3006/progress. Expect:
- Loading spinner briefly
- Empty form if no entry today, or filled read-only form if already submitted

- [ ] **Step 3: Commit**

```bash
git add apps/women-healing-room/src/app/progress/page.tsx
git commit -m "feat(women-healing-room): rewrite progress page with real API data and 7-day chart"
```

---

## Task 10: Create Progress History Page

**Files:**
- Create: `apps/women-healing-room/src/app/progress/history/page.tsx`

- [ ] **Step 1: Create the history page**

```typescript
// apps/women-healing-room/src/app/progress/history/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';

interface DiaryEntry {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  diary: string | null;
  aiFeedback: string | null;
}

const MOOD_EMOJIS = ['', '😭', '🥺', '😐', '🙂', '🤩'];
const SLEEP_EMOJIS = ['', '😫', '🥱', '😐', '😴', '🛌'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(dateStr: string): { display: string; weekday: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const display = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  return { display, weekday: `週${WEEKDAYS[d.getDay()]}` };
}

function EmojiDots({ val, emojis }: { val: number; emojis: string[] }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-base ${i <= val ? 'opacity-100' : 'opacity-20'}`}>
          {emojis[i]}
        </span>
      ))}
    </div>
  );
}

function EntryCard({ entry }: { entry: DiaryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const { display, weekday } = formatDate(entry.date);
  const previewText = entry.diary ? (entry.diary.length > 40 ? entry.diary.slice(0, 40) + '...' : entry.diary) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-semibold text-[#1E293B]">{display}</span>
            <span className="text-xs text-[#94A3B8] ml-2">{weekday}</span>
          </div>
          <span className="text-[#94A3B8] text-sm">{expanded ? '▲' : '▼'}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] w-8">心情</span>
            <EmojiDots val={entry.mood} emojis={MOOD_EMOJIS} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] w-8">睡眠</span>
            <EmojiDots val={entry.sleep} emojis={SLEEP_EMOJIS} />
          </div>
        </div>

        {previewText && !expanded && (
          <p className="text-xs text-[#94A3B8] mt-2 truncate">{previewText}</p>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#F1F5F9]">
          {entry.diary && (
            <div className="mt-3">
              <p className="text-xs font-medium text-[#64748B] mb-1">日記</p>
              <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-wrap">{entry.diary}</p>
            </div>
          )}
          {entry.aiFeedback && (
            <div className="mt-3 bg-gradient-to-br from-[#DCE8EF] to-[#E1F4F5] rounded-xl p-3">
              <p className="text-xs font-medium text-[#4A5D6E] mb-1">✨ AI 回饋</p>
              <p className="text-sm text-[#334155] leading-relaxed">「{entry.aiFeedback}」</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadEntries = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const res = await apiFetch(`/api/women/diary?page=${pageNum}&limit=20`);
      if (!res.ok) return;
      const data: { entries: DiaryEntry[]; total: number; hasMore: boolean } = await res.json();
      setEntries((prev) => append ? [...prev, ...data.entries] : data.entries);
      setHasMore(data.hasMore);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadEntries(1, false);
  }, [loadEntries]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadEntries(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page, loadEntries]);

  // Monthly stats from loaded entries
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(currentMonth));
  const avgMood = monthEntries.length
    ? (monthEntries.reduce((s, e) => s + e.mood, 0) / monthEntries.length).toFixed(1)
    : null;
  const avgSleep = monthEntries.length
    ? (monthEntries.reduce((s, e) => s + e.sleep, 0) / monthEntries.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FA] to-[#E8F7F8] pb-10">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-4">
        <Link href="/progress" className="text-[#4A5D6E] text-sm font-medium">← 返回</Link>
        <h1 className="text-lg font-semibold text-[#1E293B]">完整歷史紀錄</h1>
        <div className="w-10" />
      </header>

      <div className="px-4 space-y-4">
        {/* Monthly Stats */}
        {(avgMood || avgSleep) && (
          <section className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-[#64748B] mb-3">本月平均</p>
            <div className="flex gap-6">
              {avgMood && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#4A5D6E]">{avgMood}</p>
                  <p className="text-xs text-[#94A3B8]">情緒分數</p>
                </div>
              )}
              {avgSleep && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#7ABFBF]">{avgSleep}</p>
                  <p className="text-xs text-[#94A3B8]">睡眠分數</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-[#94A3B8]">{monthEntries.length}</p>
                <p className="text-xs text-[#94A3B8]">紀錄天數</p>
              </div>
            </div>
          </section>
        )}

        {/* Entry List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-sm text-[#64748B]">還沒有任何紀錄</p>
            <p className="text-xs text-[#94A3B8] mt-1">回到今日打卡，開始第一筆記錄吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#4A5D6E] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!hasMore && entries.length > 0 && (
          <p className="text-center text-xs text-[#94A3B8] py-2">已顯示全部 {entries.length} 筆紀錄</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the history page renders**

Open http://localhost:3006/progress/history. Expect:
- Empty state if no entries
- Entry cards with expand/collapse if entries exist

- [ ] **Step 3: Commit**

```bash
git add apps/women-healing-room/src/app/progress/history/page.tsx
git commit -m "feat(women-healing-room): add diary history page with infinite scroll and monthly stats"
```

---

## Self-Review

**Spec coverage:**
- ✅ Backend: Prisma models (Task 1), DB helpers (Task 2), Hono routes (Task 3), registered + CORS (Task 4)
- ✅ Frontend auth: `AppLayout lineOnly` wraps all pages (Task 6)
- ✅ Delete old API/Prisma (Task 7)
- ✅ Assessment pages use `apiFetch` (Task 8)
- ✅ Progress: today check-in + 7-day chart + link to history (Task 9)
- ✅ History: list view + monthly stats + expandable cards + infinite scroll (Task 10)
- ✅ Gemini calls moved to backend (Task 3)

**Out of scope (per spec):** courses payment, voice chat persistence, relief session tracking in UI.
