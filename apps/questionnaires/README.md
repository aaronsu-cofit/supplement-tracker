# Vitera Questionnaires

LIFF app that hosts every Vitera questionnaire. **One repo, one deploy,
one LIFF ID** — questionnaires live at `/q/<key>` and each page is
vibe-coded as a Next.js page.

## Adding a new questionnaire (vibe coder workflow)

### Step 1 — Ops creates it in HQ

Ops goes to HQ → Products → 問卷 tab → `+ 新增問卷`. Fills in the
spec JSON. They then copy the canonical LIFF URL displayed in the
list and forward it to the vibe coder.

### Step 2 — Vibe coder adds the page

Copy `src/app/q/example/` to `src/app/q/<your_key>/` (folder name **is**
the key). **Don't touch the `PRODUCT_ID` / `KEY` lines** at the top of
`page.tsx` — they auto-derive from `usePathname()` and `useSearchParams()`.

Design the UI freely from there: colors, animations, copy, illustrations.
The three hooks at the top handle all the backend integration:

- `useQuestionnaireSpec(productId, key)` — fetches the spec from
  `GET /api/questionnaires/:productId/:key/spec`
- `useSubmitResponse(productId, key)` — posts answers + auto-fills
  `anonymous_id` for non-LIFF browsers
- `useAnonymousId()` — used internally by `useSubmitResponse`

### Step 3 — Deploy

```bash
git push origin staging
```

The `Staging Questionnaires CI/CD` workflow takes ~5-8 min:
build Docker → push to Artifact Registry → bump kustomize tag in the
K8s manifests repo → ArgoCD sync.

### Step 4 — Test on LINE

Open the canonical URL on your phone via LINE:

```
https://liff.line.me/<LIFF_ID>?path=/q/<your_key>&product=<productId>
```

HQ shows the exact URL to copy.

## How the auto-derive works

Each questionnaire page lives at `q/<key>/page.tsx`. Inside:

```tsx
const pathname = usePathname();                  // "/q/your_key"
const params = useSearchParams();                // ?path=/q/your_key&product=abc
const KEY = pathname.split('/').filter(Boolean).pop() ?? '';
const PRODUCT_ID = params.get('product') ?? '';
```

`LiffProvider` (from `@vitera/lib`) handles the `?path=` redirect after
LIFF init, so the user lands on `/q/your_key?product=abc` with both
query params intact.

If `product` is missing from the URL, the page shows a friendly error
explaining the correct URL format.

## Anonymous mode

`ClientLayout` uses `lineOnly`: opening the URL outside LINE in-app
browser shows an "open in LINE" gate. To flip that off (e.g. for a web
lead-gen flow), drop `lineOnly` and `useSubmitResponse` will
automatically fall back to anonymous submissions. The backend stores
those rows against the localStorage-stored `anonymous_id` and skips
`on_submit_actions` hooks (since attributes / missions are user-scoped).

## LIFF ID

Configured at build time via `NEXT_PUBLIC_LIFF_ID`. Staging:
`2009369966-ZwZuOht2`. Production will get its own LIFF when prod
deploy is set up.

One LIFF covers every questionnaire under this app. Switching to per-key
LIFF IDs would be a deploy-config change, not a code change.

## Spec format

Canonical: `backend/src/lib/questionnaire/spec.types.ts`.
Local mirror: `src/types/spec.ts`. The two are kept in sync by hand —
schema changes rarely and divergence is caught at runtime.
