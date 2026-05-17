# LLM Architecture

How Vitera talks to LLMs. Two independent chains, different jobs, no shared state.

## A. AI Skill Platform (chat / ops-managed agents)

Externally hosted FastAPI service (`ai-skill-platform-staging-*.run.app`). Each OA stores its own URL + bearer token + default agent. Wrapped by `backend/src/lib/adk.ts` — calls `POST <url>/vitera/run` and `POST <url>/vitera/run_sse` with header `Authorization: Bearer <token>`.

```mermaid
flowchart TD
    classDef svc fill:#fef3c7,stroke:#d97706,color:#000
    classDef wrapper fill:#dbeafe,stroke:#2563eb,color:#000
    classDef caller fill:#e9d5ff,stroke:#7c3aed,color:#000

    AISP[("AI Skill Platform<br/>(external Cloud Run)<br/>POST /vitera/run · POST /vitera/run_sse")]:::svc

    adk["lib/adk.ts<br/>adkRun() / adkStream()"]:::wrapper
    fb["lib/llmFallback.ts<br/>runLlmFallback()<br/>+ writes unmatched_intents"]:::wrapper

    webhook["routes/webhook.ts<br/>LINE inbound — no Intent match"]:::caller
    sched["lib/scheduler.ts<br/>ai-skill-node in scenario"]:::caller
    menu["lib/menuEvaluator.ts<br/>rich-menu-selector agent"]:::caller
    ai["routes/ai.ts<br/>POST /api/ai/run · /api/ai/stream<br/>(LIFF / chat sync)"]:::caller
    test["routes/lineoa.ts<br/>POST .../test-ai-platform<br/>(HQ 測連線 button)"]:::caller

    webhook --> fb --> adk --> AISP
    sched --> adk
    menu --> adk
    ai --> adk
    test --> adk
```

### Webhook fast-path / slow-path

```mermaid
sequenceDiagram
    participant U as LINE user
    participant W as webhook handler
    participant F as runLlmFallback
    participant A as adkRun
    participant P as AI Skill Platform

    U->>W: text message
    W->>W: runIntent() — no match
    W->>F: race(promise, 9s timer)
    F->>F: insert unmatched_intents row
    F->>A: POST /run (timeout 30s)
    A->>P: HTTP
    alt response < 9s
        P-->>A: result
        A-->>F: {result, skill_key}
        F->>F: update row (reply, latency)
        F-->>W: ok
        W-->>U: replyText (replyToken — free)
    else response 9–30s
        Note over W: webhook returns 200 OK
        Note over F: promise still in-flight
        P-->>A: result (later)
        A-->>F: {result, skill_key}
        F->>F: update row (reply, latency)
        F-->>W: ok (background)
        W-->>U: pushText (charged, no token)
    else timeout / error
        F->>F: update row (error, latency)
        W-->>U: pushText "AI 顧問暫時無法回應"
    end
```

## B. Gemini direct (multimodal / structured extraction)

`backend/src/lib/ai.ts` — calls `https://generativelanguage.googleapis.com/.../models/<model>:generateContent` with the global `GEMINI_API_KEY`. Multi-model fallback list (嘗試順序)：

1. `gemini-3.1-flash-lite-preview`
2. `gemini-3-flash-preview`
3. `gemini-2.5-flash-lite`
4. `gemini-2.5-flash`
5. `gemini-flash-lite-latest`
6. `gemini-flash-latest`

```mermaid
flowchart TD
    classDef svc fill:#fef3c7,stroke:#d97706,color:#000
    classDef wrapper fill:#dbeafe,stroke:#2563eb,color:#000
    classDef caller fill:#e9d5ff,stroke:#7c3aed,color:#000

    GEMINI[("Google Gemini API<br/>generativelanguage.googleapis.com")]:::svc

    ai_lib["lib/ai.ts<br/>callGemini() · callGeminiText()<br/>parseGeminiJson()"]:::wrapper

    analyze["routes/analyze.routes.ts<br/>image analysis (supplement labels,<br/>wounds, foot, sexual health, shoe wear)"]:::caller
    wounds["routes/wounds.routes.ts<br/>SOAP note generation (via service)"]:::caller
    women["routes/womenHealing.routes.ts<br/>women's healing room Q&A + image"]:::caller

    analyze --> ai_lib --> GEMINI
    wounds --> ai_lib
    women --> ai_lib
```

## When to use which

| Scenario | Chain | Why |
|---|---|---|
| LINE chat smart reply | A. AI Skill Platform | Multi-agent, conversation memory, ops tweaks prompt without redeploy |
| Image analysis / structured extraction | B. Gemini direct | Multimodal, JSON output, no conversation context needed |
| Scheduled `ai-skill-node` push | A. AI Skill Platform | Scenario already pins which agent for which day |
| Rich menu auto-switching | A. AI Skill Platform | Uses `rich-menu-selector` agent to decide |
| HQ "測連線" button | A. AI Skill Platform | Same path as webhook fallback — green = real users get real answers |

## Auditing surface

- **`unmatched_intents` table** — only the webhook fallback path writes here. Every inbound text that didn't match an Intent rule shows up: question, reply, agent, skill_key, latency, error, `resolved` flag for ops.
- **`message_log`** — every outbound LINE message regardless of source. AI replies have `source='ai_agent'` and `source_ref=<agent_id>` (or `<agent_id>:slow`, `<agent_id>:error`).
- **`message_deliveries`** — at-most-once dedup for scheduler `ai-skill-node` pushes.

The other three Chain-A callers (scheduler, menuEvaluator, `/api/ai/run`) only console-log on failure. They're not user-feedback contexts so we don't write `unmatched_intents` rows for them.

## Per-OA config

Stored on `LineOA` row, edited at HQ → OA → Settings tab:

| Column | Used by | Notes |
|---|---|---|
| `ai_skill_platform_url` | All Chain-A callers | OA-scoped — different products can point at different platforms |
| `ai_skill_platform_api_key` | All Chain-A callers | Pre-signed bearer token, sent as `Authorization: Bearer <token>` header |
| `default_agent_id` | webhook fallback, lineoa test | Per-scenario `ai-skill-node` overrides this for its day window |

Gemini chain (B) reads `GEMINI_API_KEY` from process env — not per-OA.
