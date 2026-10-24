import Stripe from 'stripe';
import { db, Prisma } from '@vidi/db';
import { plans } from '@vidi/core';
import { ApiError } from './api';
export type Plan = keyof typeof plans;
export function billingConfigured() {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_STARTER &&
    process.env.STRIPE_PRICE_PRO &&
    process.env.STRIPE_PRICE_AGENCY &&
    process.env.APP_URL
  );
}
export function stripeClient() {
  if (!billingConfigured())
    throw new ApiError(503, 'Les abonnements doivent être configurés avant leur ouverture.');
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2, timeout: 20000 });
}
export function priceFor(plan: Plan) {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]!;
}
export function planFor(price: string): Plan | undefined {
  return (Object.keys(plans) as Plan[]).find((plan) => priceFor(plan) === price);
}
function idOf(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id;
}
export async function synchronizeSubscription(id: string) {
  const stripe = stripeClient();
  const remote = await stripe.subscriptions.retrieve(id);
  const customerId = idOf(remote.customer);
  const local = customerId ? await db.subscription.findUnique({ where: { customerId } }) : null;
  if (!local || remote.metadata.workspaceId !== local.workspaceId) return;
  const plan = planFor(remote.items.data[0]?.price.id || '');
  const active = remote.status === 'active' || remote.status === 'trialing';
  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: local.id },
      data: { stripeId: remote.id, status: remote.status },
    });
    await tx.workspace.update({
      where: { id: local.workspaceId },
      data: { plan: active && plan ? plan : 'starter' },
    });
  });
}
export async function applyBillingEvent(event: Stripe.Event) {
  const stripe = stripeClient();
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required')
      return;
    const id = idOf(session.subscription);
    if (id) await synchronizeSubscription(id);
    return;
  }
  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await synchronizeSubscription(event.data.object.id);
    return;
  }
  if (event.type === 'invoice.payment_failed') {
    const invoice = await stripe.invoices.retrieve(event.data.object.id);
    const id = idOf(invoice.parent?.subscription_details?.subscription);
    if (id) await synchronizeSubscription(id);
    return;
  }
  if (event.type !== 'invoice.paid') return;
  const invoice = await stripe.invoices.retrieve(event.data.object.id);
  if (
    invoice.status !== 'paid' ||
    !['subscription_create', 'subscription_cycle'].includes(invoice.billing_reason || '')
  )
    return;
  const subscriptionId = idOf(invoice.parent?.subscription_details?.subscription);
  if (!subscriptionId) return;
  const customerId = idOf(invoice.customer);
  const local = customerId ? await db.subscription.findUnique({ where: { customerId } }) : null;
  if (!local) return;
  const remote = await stripe.subscriptions.retrieve(subscriptionId);
  if (
    remote.metadata.workspaceId !== local.workspaceId ||
    idOf(remote.customer) !== local.customerId
  )
    throw new ApiError(409, 'Abonnement incohérent.');
  const lines = invoice.lines.data.filter(
    (line) => line.quantity === 1 && planFor(idOf(line.pricing?.price_details?.price) || ''),
  );
  if (lines.length !== 1) throw new ApiError(422, 'Facture sans offre reconnue.');
  const plan = planFor(idOf(lines[0].pricing!.price_details!.price)!)!;
  try {
    await db.$transaction(async (tx) => {
      await tx.billingEvent.create({ data: { id: `invoice:${invoice.id}`, type: 'CREDIT_GRANT' } });
      await tx.workspace.update({
        where: { id: local.workspaceId },
        data: { credits: { increment: plans[plan].credits } },
      });
      await tx.creditEntry.create({
        data: {
          workspaceId: local.workspaceId,
          amount: plans[plan].credits,
          reason: `INVOICE:${invoice.id}`,
        },
      });
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
  }
  await synchronizeSubscription(subscriptionId);
}
