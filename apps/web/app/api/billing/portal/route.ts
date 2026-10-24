import { z } from 'zod';
import { db } from '@vidi/db';
import { requireOwner } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { stripeClient } from '@/lib/billing';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { workspaceId } = z.object({ workspaceId: z.string() }).parse(await jsonBody(request));
    await requireOwner(workspaceId);
    const billing = await db.subscription.findUnique({ where: { workspaceId } });
    if (!billing) throw new ApiError(404, 'Aucun abonnement enregistré.');
    const session = await stripeClient().billingPortal.sessions.create({
      customer: billing.customerId,
      return_url: new URL(process.env.APP_URL!).origin,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return errorResponse(e);
  }
}
