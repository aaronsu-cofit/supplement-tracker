# @vitera/habits

LIFF app for habit tracking — today view, per-habit history, and a "me" profile showing streaks / badges / journey phase.

Runs on port **3007**. Auth handled by `AppLayout` from `@vitera/lib` (LIFF → session cookie). All reads/writes hit `/api/me/*` on the Vitera backend.

## Env

| Var | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_LIFF_ID` | yes | LIFF app ID from LINE Developers |
| `NEXT_PUBLIC_API_URL` | yes | Vitera backend URL (eg. `https://vitera-api-staging.cofit.me`) |
| `NEXT_PUBLIC_PRODUCT_ID` | yes | Product this LIFF is configured for. Overridable per-session via `?product_id=` query param |

## Screens

- `/` — Today: tap-to-complete cards, grouped by `category`. Quantitative habits show +step, checklist expands to subtasks, binary is a simple toggle. Cards with `action_url` open externally instead.
- `/history` — 30-day heat stripe per habit.
- `/habits/[key]` — full detail: 60-day heat map, current streak, total completions.
- `/me` — user profile: Journey phase, streaks with current/best, badges earned.

## Adding habits

Habits are configured by ops in the HQ app under **Products → 任務**. Set `mission_type` to one of the `*_daily` values and this LIFF will pick them up as soon as the user is assigned (or tap auto-subscribes via `auto_assign: true` in the log POST).
