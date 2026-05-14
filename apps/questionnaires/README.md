# Vitera Questionnaires

LIFF app that hosts every Vitera questionnaire. One repo, one deploy,
one LIFF ID — questionnaires live at `/q/<key>` and each page is
vibe-coded as a Next.js page.

## Adding a new questionnaire

### 1. Create the questionnaire in HQ

- Go to HQ → Products → the relevant product → 問卷 tab → `+ 新增問卷`
- Fill in `key`, `name`, paste the spec JSON, save
- Note the `productId` (URL) and the `key` you used

### 2. Scaffold the LIFF page

Copy the example folder:

```bash
cp -r apps/questionnaires/src/app/q/example apps/questionnaires/src/app/q/<your_key>
```

Edit `apps/questionnaires/src/app/q/<your_key>/page.tsx`:

- Set `PRODUCT_ID` to your product id
- Set `KEY` to your questionnaire key
- Vibe-code the UI however you want — colors, animations, copy, illustrations

The three hooks do all the integration work:

- `useQuestionnaireSpec(productId, key)` → fetches the spec
- `useSubmitResponse(productId, key)` → submits answers, returns scores + interpretation
- `useAnonymousId()` → stable per-device anonymous id (auto-used by `useSubmitResponse`)

### 3. Deploy

`pnpm --filter @vitera/questionnaires build && pnpm --filter @vitera/questionnaires start`

In production this app deploys via Docker (same shape as the other LIFF apps).
The shared LIFF ID is configured via `NEXT_PUBLIC_LIFF_ID` at build time —
one LIFF covers every questionnaire under this app.

### 4. Wire LIFF URL back into HQ

Once deployed, copy the LIFF URL of `/q/<your_key>` and paste it into
the questionnaire's `liff_url` field in HQ. Rich menus, scenarios,
and intent rules can then link to it directly.

## Anonymous mode

If a user opens the URL outside LINE in-app browser, `lineOnly` in
`ClientLayout` will gate them. To opt-out (e.g. for marketing lead-gen
web), wrap that page without `lineOnly` and `useSubmitResponse` will
automatically fall back to anonymous_id submissions. The backend
stores those rows against the anonymous_id and skips hooks (since
attributes / missions are user-scoped).

## Spec format

See `backend/src/lib/questionnaire/spec.types.ts` and
`backend/docs/db-conventions.md` for the canonical schema. The
TypeScript shape is mirrored in `src/types/spec.ts`.
