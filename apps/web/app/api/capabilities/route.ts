import { storageConfigured } from '@/lib/storage';
import { billingConfigured } from '@/lib/billing';
import { llmConfigured, guestScriptsEnabled } from '@/lib/llm';
export async function GET() {
  return Response.json({
    database: !!process.env.DATABASE_URL,
    scripts: llmConfigured(),
    guestScripts: guestScriptsEnabled(),
    video: !!(
      process.env.VIDEO_GATEWAY_URL &&
      process.env.VIDEO_GATEWAY_TOKEN &&
      process.env.VIDEO_OUTPUT_HOSTS &&
      process.env.REDIS_URL
    ),
    storage: storageConfigured(),
    billing: billingConfigured(),
    trends: false,
    ecommerce: false,
    voiceCloning: false,
  });
}
