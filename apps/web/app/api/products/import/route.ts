import { z } from 'zod';
import { checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { requireWorkspace } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { fetchProductPage, productUrl } from '@/lib/product-fetch';
import { extractProduct } from '@/lib/product-metadata';
export const runtime = 'nodejs';
export const maxDuration = 30;
const schema = z.object({ workspaceId: z.string().min(1), url: z.string().max(2000) });
export async function POST(request: Request) {
  try {
    checkOrigin(request, true);
    const input = schema.parse(await jsonBody(request));
    await requireWorkspace(input.workspaceId, true, request);
    productUrl(input.url);
    await rateLimit(`product-import:${input.workspaceId}`, 6, 60);
    await rateLimit(`product-import:daily:${input.workspaceId}`, 50, 86400);
    const page = await fetchProductPage(input.url);
    return Response.json({ product: extractProduct(page.html, page.url) });
  } catch (error) {
    return errorResponse(error);
  }
}
