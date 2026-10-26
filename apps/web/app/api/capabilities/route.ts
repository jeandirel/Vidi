import { db } from '@vidi/db';
import { requireWorkspace } from '@/lib/auth';
import { errorResponse } from '@/lib/api';
import { mediaConfigured, mediaCapabilities, videoConfigured } from '@/lib/media-config';
import { storageConfigured } from '@/lib/storage';
import { billingConfigured } from '@/lib/billing';
import { llmConfigured, guestScriptsEnabled } from '@/lib/llm';
import { isGoogleAuthAvailable } from '@/lib/google-auth';
export async function GET(request: Request) {
  try {
    const workspaceId = new URL(request.url).searchParams.get('workspaceId');
    let providers: string[] = [];
    if (workspaceId) {
      await requireWorkspace(workspaceId);
      providers = (
        await db.serviceConnection.findMany({ where: { workspaceId }, select: { provider: true } })
      ).map((c) => c.provider);
    }
    const engines = await mediaCapabilities();
    return Response.json(
      {
        database: !!process.env.DATABASE_URL,
        googleAuth: isGoogleAuthAvailable(),
        scripts: llmConfigured(),
        guestScripts: guestScriptsEnabled(),
        video: mediaConfigured() ? !!(engines?.product || engines?.avatar) : videoConfigured(),
        media: engines,
        storage: storageConfigured(),
        billing: billingConfigured(),
        trends: providers.includes('youtube'),
        ecommerce: providers.some((p) => p === 'shopify' || p === 'woocommerce'),
        voiceCloning: !!engines?.tts,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
