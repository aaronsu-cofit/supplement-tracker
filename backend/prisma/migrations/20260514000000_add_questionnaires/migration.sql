-- Questionnaire system (Product-scoped, LIFF-fronted)
--
-- Layer 1.1 of the questionnaire plan:
--   • questionnaires       — spec + scoring + on-submit hooks
--   • questionnaire_responses — append-only per submission (multi-record)
--
-- Background:
--   - LIFF apps (apps/questionnaires/q/[key]) call GET /spec to render
--     and POST /responses to submit.
--   - Server validates + scores + fires on_submit_actions hooks.
--   - Future web version stores responses against anonymous_id; LIFF
--     submissions store against user_id. CHECK constraint enforces
--     one or the other is present.

CREATE TABLE "questionnaires" (
  "id"          VARCHAR(30)  NOT NULL,
  "product_id"  VARCHAR(30)  NOT NULL,
  "key"         VARCHAR(100) NOT NULL,
  "name"        VARCHAR(200) NOT NULL,
  "description" TEXT,

  -- Full spec JSON: question_sets, questions, choices, visible_if,
  -- calculation_type, interpretation_bands, classification_rules.
  -- See backend/docs/questionnaire-spec.md for schema (added later).
  "spec"        JSONB        NOT NULL DEFAULT '{"question_sets":[]}'::jsonb,

  -- Actions fired after a response is successfully scored. Same shape
  -- as MissionTemplate.on_complete_actions:
  --   [{ type: 'set_attribute', key, value },
  --    { type: 'assign_mission', mission_key },
  --    { type: 'transition_journey', journey_key, phase_key }]
  "on_submit_actions" JSONB  NOT NULL DEFAULT '[]'::jsonb,

  -- URL of the LIFF page that renders this questionnaire. Filled in HQ
  -- once the vibe-coded page is deployed. Referenced by rich menu /
  -- scenario push / intent rule reply to drive users in.
  "liff_url"    TEXT,

  "is_active"   BOOLEAN      NOT NULL DEFAULT true,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "questionnaires_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "questionnaires_product_id_key_key"
  ON "questionnaires"("product_id", "key");

CREATE INDEX "idx_questionnaires_product"
  ON "questionnaires"("product_id");


CREATE TABLE "questionnaire_responses" (
  "id"               VARCHAR(30)  NOT NULL,
  "questionnaire_id" VARCHAR(30)  NOT NULL,

  -- Exactly one of user_id / anonymous_id is non-null (CHECK below).
  -- LIFF flow: user_id from LINE profile. Web flow (later): anonymous_id
  -- is a client-side UUID stored in localStorage / cookie.
  "user_id"          VARCHAR(64),
  "anonymous_id"     VARCHAR(64),

  -- Answers keyed by question id: { [question_id]: choice_id | [choice_ids] | text }
  "answers"          JSONB        NOT NULL,

  -- Computed scores keyed by question_set.key:
  --   { [dimension_key]: number | string }
  -- E.g. { sleep_quality: 8, hormone_type: "2L 1P" }
  "scores"           JSONB        NOT NULL,

  -- Score → text mapping from interpretation_bands + classification_rules.
  -- Optional — only filled if the spec defines bands/rules.
  "interpretation"   JSONB,

  -- Audit log of which on_submit_actions actually fired (some may skip
  -- if idempotency guards prevent re-firing).
  "triggered_actions" JSONB       NOT NULL DEFAULT '[]'::jsonb,

  "started_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at"     TIMESTAMP(3),

  CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "questionnaire_responses_questionnaire_id_fkey"
    FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "questionnaire_responses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "questionnaire_responses_user_or_anon"
    CHECK ((user_id IS NOT NULL) OR (anonymous_id IS NOT NULL))
);

CREATE INDEX "idx_questionnaire_responses_q_completed"
  ON "questionnaire_responses"("questionnaire_id", "completed_at" DESC);

CREATE INDEX "idx_questionnaire_responses_user"
  ON "questionnaire_responses"("user_id", "completed_at" DESC)
  WHERE "user_id" IS NOT NULL;

CREATE INDEX "idx_questionnaire_responses_anon"
  ON "questionnaire_responses"("anonymous_id", "completed_at" DESC)
  WHERE "anonymous_id" IS NOT NULL;
