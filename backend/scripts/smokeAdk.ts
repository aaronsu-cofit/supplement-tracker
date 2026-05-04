/**
 * Smoke-test the AI Skill Platform connection without going through
 * LINE / webhooks / DB. Reads URL + (optional) bearer token + agent
 * from argv or env, calls adkRun once, prints what came back.
 *
 * The token is whatever the platform expects in `Authorization: Bearer
 * <token>` — Vitera forwards it as-is, doesn't sign anything itself.
 * Generate it on the warehouse side (`Token.tokenize(member)`) or
 * wherever your platform's auth lives.
 *
 * Usage:
 *   pnpm tsx scripts/smokeAdk.ts <url> [agent_id] [bearer_token]
 *
 * Examples:
 *   ADK_BEARER_TOKEN=eyJhbGciOiJIUzI1NiJ9... pnpm tsx scripts/smokeAdk.ts https://x.run.app
 *   pnpm tsx scripts/smokeAdk.ts https://x.run.app nutrition_analyst eyJhbGciOiJIUzI1NiJ9...
 */
import { adkRun } from '../src/lib/adk.js';

async function main() {
  const url = process.argv[2] || process.env.ADK_URL;
  const agentId = process.argv[3] || process.env.ADK_AGENT_ID || 'nutrition_analyst';
  const bearerToken = process.argv[4] || process.env.ADK_BEARER_TOKEN || process.env.ADK_API_KEY || null;
  const message = process.env.ADK_MESSAGE || '哈囉，這是一個測試訊息';

  if (!url) {
    console.error('Usage: pnpm tsx scripts/smokeAdk.ts <url> [agent_id] [bearer_token]');
    console.error('Or set ADK_URL + ADK_BEARER_TOKEN env vars.');
    process.exit(1);
  }

  console.log('--- AI Skill Platform smoke test ---');
  console.log('  URL:    ', url);
  console.log('  Agent:  ', agentId);
  console.log('  Token:  ', bearerToken ? `***${bearerToken.slice(-4)} (sent as Authorization: Bearer)` : '(none — Authorization header omitted)');
  console.log('  Message:', message);
  console.log('');

  const started = Date.now();
  try {
    const result = await adkRun(agentId, 'smoke-test-client', { message }, { url, bearerToken });
    const latency = Date.now() - started;
    console.log(`✅ OK in ${latency}ms`);
    console.log('  skill_key:', result.skill_key);
    console.log('  result:   ', result.result?.slice(0, 500) || '(empty)');
    process.exit(0);
  } catch (err) {
    const latency = Date.now() - started;
    console.error(`❌ FAILED after ${latency}ms`);
    console.error('  ', (err as Error).message);
    process.exit(2);
  }
}

main().catch(err => {
  console.error('Unexpected:', err);
  process.exit(3);
});
