import type Stripe from 'stripe';
import { applyBillingEvent } from '../../apps/web/lib/billing';
import { db, Prisma } from '@vidi/db';
const mockRemote = { invoices: { retrieve: jest.fn() }, subscriptions: { retrieve: jest.fn() } };
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockRemote),
}));
jest.mock('@vidi/db', () => {
  class Known extends Error {
    code: string;
    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  }
  const tx = {
    billingEvent: { create: jest.fn() },
    workspace: { update: jest.fn() },
    creditEntry: { create: jest.fn() },
    subscription: { update: jest.fn() },
  };
  return {
    db: {
      ...tx,
      subscription: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    },
    Prisma: { PrismaClientKnownRequestError: Known },
  };
});
const env = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(process.env, {
    STRIPE_SECRET_KEY: 'sk_test_unit_only',
    STRIPE_WEBHOOK_SECRET: 'whsec_unit_only',
    STRIPE_PRICE_STARTER: 'price_starter',
    STRIPE_PRICE_PRO: 'price_pro',
    STRIPE_PRICE_AGENCY: 'price_agency',
    APP_URL: 'https://vidi.example',
  });
  (db.subscription.findUnique as unknown as jest.Mock).mockResolvedValue({
    id: 'local',
    workspaceId: 'workspace',
    customerId: 'customer',
  });
  mockRemote.subscriptions.retrieve.mockResolvedValue({
    id: 'subscription',
    customer: 'customer',
    metadata: { workspaceId: 'workspace' },
    status: 'active',
    items: { data: [{ price: { id: 'price_pro' } }] },
  });
  mockRemote.invoices.retrieve.mockResolvedValue({
    id: 'invoice',
    status: 'paid',
    billing_reason: 'subscription_cycle',
    customer: 'customer',
    parent: { subscription_details: { subscription: 'subscription' } },
    lines: { data: [{ quantity: 1, pricing: { price_details: { price: 'price_pro' } } }] },
  });
});
afterEach(() => {
  process.env = { ...env };
});
const event = {
  type: 'invoice.paid',
  data: { object: { id: 'invoice' } },
} as unknown as Stripe.Event;
test('a paid monthly invoice credits the mapped plan amount', async () => {
  await applyBillingEvent(event);
  expect(db.workspace.update).toHaveBeenCalledWith({
    where: { id: 'workspace' },
    data: { credits: { increment: 60 } },
  });
  expect(db.creditEntry.create).toHaveBeenCalledWith({
    data: { workspaceId: 'workspace', amount: 60, reason: 'INVOICE:invoice' },
  });
});
test('a repeated invoice stops before a second credit grant', async () => {
  await applyBillingEvent(event);
  (db.billingEvent.create as unknown as jest.Mock).mockRejectedValueOnce(
    new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }),
  );
  await applyBillingEvent(event);
  expect(db.creditEntry.create).toHaveBeenCalledTimes(1);
});
test('a proration invoice does not grant a full new monthly allowance', async () => {
  mockRemote.invoices.retrieve.mockResolvedValueOnce({
    status: 'paid',
    billing_reason: 'subscription_update',
  });
  await applyBillingEvent(event);
  expect(db.creditEntry.create).not.toHaveBeenCalled();
});
test('a mismatched workspace in provider metadata is rejected', async () => {
  mockRemote.subscriptions.retrieve.mockResolvedValueOnce({
    customer: 'customer',
    metadata: { workspaceId: 'different-workspace' },
  });
  await expect(applyBillingEvent(event)).rejects.toMatchObject({ status: 409 });
  expect(db.creditEntry.create).not.toHaveBeenCalled();
});
