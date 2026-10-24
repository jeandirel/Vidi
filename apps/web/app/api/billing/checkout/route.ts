import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '@vidi/db';
import { plans } from '@vidi/core';
import { requireOwner } from '@/lib/auth';
import { ApiError, checkOrigin, errorResponse, jsonBody } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { priceFor, stripeClient } from '@/lib/billing';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({ workspaceId: z.string(), plan: z.enum(['starter', 'pro', 'agency']) })
      .parse(await jsonBody(request));
    const { user } = await requireOwner(input.workspaceId);
    await rateLimit(`checkout:${input.workspaceId}`, 3, 60);
    const stripe = stripeClient();
    const price = await stripe.prices.retrieve(priceFor(input.plan));
    if (
      !price.active ||
      price.currency !== 'eur' ||
      price.unit_amount !== plans[input.plan].price * 100 ||
      price.recurring?.interval !== 'month' ||
      price.recurring.interval_count !== 1
    )
      throw new ApiError(503, 'Le tarif de cette offre n’est pas correctement configuré.');
    let billing = await db.subscription.findUnique({ where: { workspaceId: input.workspaceId } });
    if (!billing) {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { workspaceId: input.workspaceId } },
        { idempotencyKey: `vidi-customer-${input.workspaceId}` },
      );
      billing = await db.subscription.upsert({
        where: { workspaceId: input.workspaceId },
        create: { workspaceId: input.workspaceId, customerId: customer.id },
        update: {},
      });
    }
    const current = await stripe.subscriptions.list({
      customer: billing.customerId,
      status: 'all',
      limit: 100,
    });
    if (
      current.data.some((s) =>
        ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'].includes(s.status),
      )
    )
      throw new ApiError(409, 'Un abonnement existe déjà. Utilisez le portail de facturation.');
    // Reuse an open Checkout Session to prevent duplicate subscriptions from repeated clicks.
    const open = await stripe.checkout.sessions.list({
      customer: billing.customerId,
      status: 'open',
      limit: 10,
    });
    if (open.data[0]?.url) return Response.json({ url: open.data[0].url });
    const locked = await db.subscription.updateMany({
      where: {
        id: billing.id,
        OR: [{ checkoutLockedUntil: null }, { checkoutLockedUntil: { lt: new Date() } }],
      },
      data: { checkoutLockedUntil: new Date(Date.now() + 120000) },
    });
    if (!locked.count)
      throw new ApiError(
        409,
        'Une ouverture de paiement est déjà en cours. Réessayez dans un instant.',
      );
    const currentBilling = await db.subscription.findUniqueOrThrow({ where: { id: billing.id } });
    let nonce = currentBilling.checkoutKey;
    if (currentBilling.checkoutSessionId) {
      const old = await stripe.checkout.sessions.retrieve(currentBilling.checkoutSessionId);
      if (old.status === 'open' && old.url) {
        await db.subscription.update({
          where: { id: billing.id },
          data: { checkoutLockedUntil: null },
        });
        return Response.json({ url: old.url });
      }
      nonce = null;
    }
    if (nonce && currentBilling.checkoutPlan !== input.plan)
      throw new ApiError(409, 'Terminez ou annulez d’abord la demande de paiement précédente.');
    nonce ??= randomUUID();
    await db.subscription.update({
      where: { id: billing.id },
      data: { checkoutKey: nonce, checkoutPlan: input.plan, checkoutSessionId: null },
    });
    const origin = new URL(process.env.APP_URL!).origin;
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: billing.customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { workspaceId: input.workspaceId },
        subscription_data: { metadata: { workspaceId: input.workspaceId } },
        integration_identifier: `vidi_${createHash('sha256').update(nonce).digest('hex').slice(0, 8).replace(/[0-9]/g, 'a')}`,
        success_url: `${origin}/?billing=success`,
        cancel_url: `${origin}/?billing=cancelled`,
      },
      { idempotencyKey: `vidi-checkout-${input.workspaceId}-${nonce}` },
    );
    await db.subscription.update({
      where: { id: billing.id },
      data: { checkoutSessionId: session.id, checkoutLockedUntil: null },
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return errorResponse(e);
  }
}
