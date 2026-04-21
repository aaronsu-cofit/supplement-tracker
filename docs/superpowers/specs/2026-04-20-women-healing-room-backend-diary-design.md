# Women Healing Room — Backend Integration & Mood Diary

**Date:** 2026-04-20  
**Status:** Approved  
**Scope:** Move Prisma + API to shared backend, implement LINE LIFF auth (all pages), implement mood diary with history

---

## Overview

The `women-healing-room` Next.js app is currently standalone with its own Prisma schema and Next.js API routes. This spec covers:

1. Migrating all backend logic (Prisma models + API routes + Gemini calls) into the shared `backend/` Express server
2. Adding LINE LIFF authentication to all pages via `@vitera/lib`
3. Implementing the mood diary feature with daily check-in, AI feedback, and full history view

---

## Architecture

```
women-healing-room (Next.js, port 3006)
  └─ @vitera/lib (LiffProvider, AuthProvider, apiFetch)
       └─ backend (Express, port 4000)
            ├─ authMiddleware (JWT via auth_token cookie)
            ├─ /api/women/* routes
            │    ├─ Gemini API calls (diary feedback, assessment analyze, face scan)
            │    └─ Prisma (read/write DiaryEntry, AssessmentResult, ReliefSession)
            └─ Prisma → PostgreSQL (shared DB)
```

All existing apps follow this same pattern. Women-healing-room becomes a pure frontend.

---

## Section 1: Backend Changes

### 1.1 Prisma Schema

Add to `backend/prisma/schema.prisma`. User model already exists (supports `line` auth provider).

```prisma
model DiaryEntry {
  id         String   @id @default(cuid())
  userId     String
  date       DateTime @db.Date
  mood       Int      // 1–5
  sleep      Int      // 1–5
  diary      String?  @db.Text
  aiFeedback String?  @db.Text
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])

  @@unique([userId, date])
}

model ReliefSession {
  id          String     @id @default(cuid())
  userId      String
  type        ReliefType
  durationSec Int
  completedAt DateTime   @default(now())
  user        User       @relation(fields: [userId], references: [id])
}

model AssessmentResult {
  id          String   @id @default(cuid())
  userId      String
  resultType  String   // "A" | "B" | "C"
  scores      Json
  aiAnalysis  Json
  faceInsight String?  @db.Text
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])
}

enum ReliefType {
  BREATHING
  BODY_SCAN
  SLEEP_QUOTES
}
```

Run: `pnpm --filter backend prisma migrate dev --name add-women-healing-room`

### 1.2 Routes File

New file: `backend/src/routes/womenHealing.ts`

All routes use `authMiddleware`. `userId` read from `req.user.id`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/women/diary` | required | All diary entries, paginated (default 20/page, newest first) |
| `GET` | `/api/women/diary/today` | required | Today's entry (null if none) |
| `POST` | `/api/women/diary` | required | Upsert today's entry, call Gemini, return with AI feedback |
| `POST` | `/api/women/assessment/scan` | required | Face scan via Gemini Vision, return insight text |
| `POST` | `/api/women/assessment/analyze` | required | Analyze quiz scores + face insight, save result, return report |
| `POST` | `/api/women/relief` | required | Record a completed relief session |

**Gemini calls move to backend.** `GEMINI_API_KEY` added to `backend/.env`.

### 1.3 Diary POST Logic (Upsert + Gemini)

```
POST /api/women/diary
  body: { mood, sleep, diary? }

1. Get today's date (UTC+8 Taiwan time)
2. upsert DiaryEntry where { userId, date }
3. Call Gemini with mood/sleep/diary text → get aiFeedback
4. Update DiaryEntry.aiFeedback
5. Return full DiaryEntry
```

If Gemini fails, use keyword-based fallback (preserve existing fallback logic from current `/api/diary/feedback`).

### 1.4 Register Routes

In `backend/src/index.ts` (or app.ts), add:
```ts
import womenHealingRouter from './routes/womenHealing'
app.use('/api/women', authMiddleware, womenHealingRouter)
```

---

## Section 2: Frontend Auth

### 2.1 Dependencies

`apps/women-healing-room/package.json`:
```json
{
  "dependencies": {
    "@vitera/lib": "workspace:*",
    "@line/liff": "^2.27.3"
  }
}
```

Remove: `@google/generative-ai` (Gemini moves to backend)

### 2.2 Root Layout

`src/app/layout.tsx` — wrap with providers:
```tsx
import { LiffProvider, AuthProvider } from '@vitera/lib'

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>
        <LiffProvider liffId={process.env.NEXT_PUBLIC_LIFF_ID!}>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
          </AuthProvider>
        </LiffProvider>
      </body>
    </html>
  )
}
```

### 2.3 ClientLayout (Auth Guard)

New file: `src/app/ClientLayout.tsx`

```tsx
'use client'
import { useAuth } from '@vitera/lib'

export default function ClientLayout({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return null  // LiffProvider handles redirect
  return <>{children}</>
}
```

### 2.4 Remove from App

- Delete `apps/women-healing-room/prisma/` (entire folder)
- Delete `apps/women-healing-room/src/app/api/` (entire folder)
- Remove `@google/generative-ai` from package.json

### 2.5 API Calls

Replace all `fetch('/api/...')` with `apiFetch('/api/women/...')` from `@vitera/lib`.

This applies to:
- `/progress/page.tsx` → `apiFetch('/api/women/diary')` and `apiFetch('/api/women/diary/today')`
- `/assessment/photo/page.tsx` → `apiFetch('/api/women/assessment/scan')`
- `/assessment/page.tsx` → `apiFetch('/api/women/assessment/analyze')`
- `/relief/complete/page.tsx` → `apiFetch('/api/women/relief')`

### 2.6 Environment Variables

`.env.local`:
```
NEXT_PUBLIC_LIFF_ID=<LINE LIFF ID>
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Section 3: Mood Diary Feature

### 3.1 `/progress` Page — Today's Check-in

**State logic:**
- On mount: `GET /api/women/diary/today`
- If entry exists → show filled form (read-only) + AI feedback
- If no entry → show empty form (editable)

**UI Sections:**

**① Today's Check-in Form**
- Mood selector: 5 emoji buttons (😭😔😐🙂🤩), value 1–5
- Sleep selector: 5 emoji buttons (😫😪😐🛌✨), value 1–5
- Diary textarea (optional, placeholder: "今天有什麼想說的...")
- Save button → `POST /api/women/diary` → show AI feedback
- After save: form becomes read-only

**② AI Feedback Block**
- Appears after save (or on load if today already saved)
- Gemini-generated warm response in quotes: 「...」
- Soft background color, distinct from form

**③ 7-Day Mini Chart**
- Line chart: mood (purple) + sleep (teal), past 7 days including today
- Data from `/api/women/diary?limit=7`
- X-axis: day abbreviations (日一二三四五六)
- Link at bottom: "查看完整歷史 →" → `/progress/history`

### 3.2 `/progress/history` Page — History View

**Header stats:**
- This month's average mood score (e.g., 3.8/5)
- This month's average sleep score (e.g., 3.2/5)

**Entry list (newest first):**

```
┌──────────────────────────────────┐
│ 2026/04/20  週日                  │
│ 心情 🙂🙂🙂🙂  睡眠 🛌🛌🛌         │
│ "今天感覺壓力很大，但還是..."  ▼   │
└──────────────────────────────────┘
  ▼ 展開後：
┌──────────────────────────────────┐
│ 完整日記內容...                   │
│                                  │
│ AI 回饋：                         │
│ 「你願意寫下這些，已經很勇敢了...」 │
└──────────────────────────────────┘
```

- Entry card shows: date, weekday, mood/sleep emoji indicators, diary preview (truncated to 40 chars)
- Click to expand: full diary text + AI feedback
- Infinite scroll (20 entries/page, load more on scroll to bottom)
- Back button → `/progress`

### 3.3 Diary API Parameters

**GET /api/women/diary**
- Query: `?page=1&limit=20`
- Response: `{ entries: DiaryEntry[], total: number, hasMore: boolean }`

**GET /api/women/diary/today**
- Response: `DiaryEntry | null`

**POST /api/women/diary**
- Body: `{ mood: number, sleep: number, diary?: string }`
- Response: `DiaryEntry` (with `aiFeedback` populated)

---

## Files to Create/Modify

### Backend
| Action | File |
|--------|------|
| Modify | `backend/prisma/schema.prisma` |
| Create | `backend/src/routes/womenHealing.ts` |
| Modify | `backend/src/index.ts` (register router) |
| Modify | `backend/.env` (add GEMINI_API_KEY) |

### Frontend (women-healing-room)
| Action | File |
|--------|------|
| Modify | `apps/women-healing-room/package.json` |
| Modify | `apps/women-healing-room/src/app/layout.tsx` |
| Create | `apps/women-healing-room/src/app/ClientLayout.tsx` |
| Modify | `apps/women-healing-room/src/app/progress/page.tsx` |
| Create | `apps/women-healing-room/src/app/progress/history/page.tsx` |
| Delete | `apps/women-healing-room/prisma/` |
| Delete | `apps/women-healing-room/src/app/api/` |

---

## Out of Scope

- Payment integration for `/courses`
- Push/email notifications
- Admin dashboard
- Voice chat persistence
- Editing or deleting diary entries (read + create only)
