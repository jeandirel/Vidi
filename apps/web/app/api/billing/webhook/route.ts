import { ApiError, errorResponse } from '@/lib/api';
import { stripeClient, applyBillingEvent } from '@/lib/billing';
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('stripe-signature');
    if (!signature) throw new ApiError(400, 'Signature absente.');
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, 'Événement absent.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        throw new ApiError(413, 'Événement trop volumineux.');
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks);
    let event;
    try {
      event = stripeClient().webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(400, 'Signature invalide.');
    }
    await applyBillingEvent(event);
    return Response.json({ received: true });
  } catch (e) {
    return errorResponse(e);
  }
}
