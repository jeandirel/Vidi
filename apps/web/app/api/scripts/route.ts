import { z } from 'zod';
import { brandBriefSchema, evidenceSchema, productSchema } from '@vidi/core';
import { requireWorkspace } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { generateScript, guestScriptsEnabled } from '@/lib/llm';
import { guestLimit } from '@/lib/guest-limit';
export const maxDuration = 60;
const schema = z.object({
  workspaceId: z.string().default(''),
  product: productSchema,
  language: z.enum(['fr', 'en', 'es', 'de', 'pt']),
  duration: z.union([
    z.literal(6),
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
  ]),
  dataConsent: z.literal(true),
  creativeContext: z
    .object({
      brief: brandBriefSchema,
      evidence: z.array(evidenceSchema).max(8),
      inspiration: z
        .array(z.object({ title: z.string().max(1000), note: z.string().max(600) }))
        .max(8)
        .optional(),
    })
    .optional(),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = schema.parse(await jsonBody(request));
    if (input.workspaceId) {
      await requireWorkspace(input.workspaceId, true, request);
      if (input.workspaceId !== 'ws_local') {
        try {
          await rateLimit(`scripts:${input.workspaceId}`, 10, 60);
          await rateLimit(`scripts:daily:${input.workspaceId}`, 100, 86400);
        } catch {
          /* rate limiter fallback when db is offline */
        }
      }
    } else {
      if (!guestScriptsEnabled())
        throw new ApiError(401, 'Connectez-vous pour accéder au générateur de scripts.');
      if (process.env.REDIS_URL || process.env.DATABASE_URL) {
        try {
          await rateLimit('scripts:guest:global', 10, 60);
          await rateLimit('scripts:guest:day', 100, 86400);
        } catch {
          /* rate limiter fallback */
        }
      } else {
        guestLimit();
      }
    }
    return Response.json(await generateScript(input));
  } catch (error) {
    return errorResponse(error);
  }
}
