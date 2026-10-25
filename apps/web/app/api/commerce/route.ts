import { db } from '@vidi/db';
import { z } from 'zod';
import { requireWorkspace } from '@/lib/auth';
import { errorResponse, ApiError } from '@/lib/api';
import { catalog, reviews } from '@/lib/connections';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const input = z
      .object({
        workspaceId: z.string(),
        provider: z.enum(['shopify', 'woocommerce']),
        q: z.string().max(100).default(''),
        cursor: z.string().max(500).default(''),
        productId: z.string().max(100).optional(),
      })
      .parse(params);
    await requireWorkspace(input.workspaceId, false, request);
    await rateLimit(`catalog:${input.workspaceId}`, 20, 60);
    const connection = await db.serviceConnection.findUnique({
      where: { workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider } },
    });
    if (!connection) throw new ApiError(409, 'Connectez d’abord cette boutique dans Mon espace.');
    const { url } = z.object({ url: z.string() }).parse(connection.config);
    if (input.productId) {
      if (input.provider !== 'woocommerce')
        throw new ApiError(
          422,
          'Les avis Shopify ne sont pas exposés par le catalogue Storefront.',
        );
      return Response.json(
        { reviews: await reviews(url, input.productId), fetchedAt: new Date().toISOString() },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    return Response.json(
      {
        ...(await catalog(input.provider, url, input.q, input.cursor)),
        provider: input.provider,
        fetchedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
