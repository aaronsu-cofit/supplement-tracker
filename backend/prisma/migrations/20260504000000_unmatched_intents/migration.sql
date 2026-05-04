-- Captures every inbound LINE text that didn't match an Intent rule and
-- thus fell through to the LLM fallback. Ops uses this to find common
-- real-world questions and turn them into new Intent rules. `resolved`
-- flips to true once the question is covered by a rule.
CREATE TABLE "unmatched_intents" (
  "id"          SERIAL PRIMARY KEY,
  "user_id"     VARCHAR(64) NOT NULL,
  "oa_id"       INTEGER     NOT NULL,
  "product_id"  VARCHAR(30),
  "agent_id"    VARCHAR(100),
  "message"     VARCHAR(2000) NOT NULL,
  "reply"       TEXT,
  "skill_key"   VARCHAR(100),
  "model"       VARCHAR(100),
  "latency_ms"  INTEGER,
  "error"       TEXT,
  "resolved"    BOOLEAN     NOT NULL DEFAULT false,
  "created_at"  TIMESTAMP   NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX "idx_unmatched_intents_oa_created" ON "unmatched_intents"("oa_id", "created_at" DESC);
CREATE INDEX "idx_unmatched_intents_resolved" ON "unmatched_intents"("resolved", "created_at" DESC);
CREATE INDEX "idx_unmatched_intents_user_created" ON "unmatched_intents"("user_id", "created_at" DESC);
