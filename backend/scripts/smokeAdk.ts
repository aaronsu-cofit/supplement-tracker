/**
 * Smoke-test the AI Skill Platform connection without going through
 * LINE / webhooks / DB. Reads URL + (optional) API key + agent from
 * argv or env, calls adkRun once, prints what came back.
 *
 * Usage:
 *   pnpm tsx scripts/smokeAdk.ts <url> [agent_id] [api_key]
 *
 * Examples:
 *   pnpm tsx scripts/smokeAdk.ts https://ai-skill-platform-staging-xxx.run.app nutrition_analyst
 *   pnpm tsx scripts/smokeAdk.ts https://x.run.app nutrition_analyst sk_live_abc
 *   ADK_URL=https://x.run.app pnpm tsx scripts/smokeAdk.ts
 */
import { adkRun } from '../src/lib/adk.js';

async function main() {
  const url = process.argv[2] || process.env.ADK_URL;
  const agentId = process.argv[3] || process.env.ADK_AGENT_ID || 'nutrition_analyst';
  const apiKey = process.argv[4] || process.env.ADK_API_KEY || null;
  const message = process.env.ADK_MESSAGE || '哈囉，這是一個測試訊息';

  if (!url) {
    console.error('Usage: pnpm tsx scripts/smokeAdk.ts <url> [agent_id] [api_key]');
    console.error('Or set ADK_URL env var.');
    process.exit(1);
  }

  console.log('--- AI Skill Platform smoke test ---');
  console.log('  URL:      ', url);
  console.log('  Agent:    ', agentId);
  console.log('  API key:  ', apiKey ? `***${apiKey.slice(-4)} (sent as X-API-Key)` : '(none — header omitted)');
  console.log('  Message:  ', message);
  console.log('');

  const started = Date.now();
  try {
    const result = await adkRun(agentId, 'smoke-test-client', { message }, { url, apiKey });
    const latency = Date.now() - started;
    console.log(`✅ OK in ${latency}ms`);
    console.log('  skill_key: ', result.skill_key);
    console.log('  result:    ', result.result?.slice(0, 500) || '(empty)');
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
