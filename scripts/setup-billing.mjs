/** Explicit operator command. Creates configuration, never a subscription or charge. */
import { createRequire } from 'node:module';
import { writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const Stripe = require('stripe');
const output = new URL('../.env.billing', import.meta.url);
const plans = [
  ['STARTER', 99],
  ['PRO', 299],
  ['AGENCY', 999],
];
const events = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];
try {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!/^(?:rk|sk)_(?:test|live)_/.test(key))
    throw new Error(
      'Fournissez une clé Stripe restreinte via STRIPE_SECRET_KEY dans votre environnement local.',
    );
  if (key.includes('_live_') && process.env.STRIPE_SETUP_ALLOW_LIVE !== 'true')
    throw new Error(
      'Mode test attendu. Le mode réel exige STRIPE_SETUP_ALLOW_LIVE=true et un compte explicitement choisi.',
    );
  const origin = new URL(process.env.APP_URL || '');
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search
  )
    throw new Error('APP_URL doit être une origine HTTPS publique.');
  // Never overwrite an existing signing secret on disk, including a partially completed setup.
  try {
    await access(output, constants.F_OK);
    throw new Error(
      'Le fichier .env.billing existe déjà. Réutilisez sa configuration ; il ne sera pas écrasé.',
    );
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const hookUrl = origin.origin + '/api/billing/webhook';
  const probe = await fetch(hookUrl, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (probe.status !== 405)
    throw new Error(
      'Le webhook doit répondre publiquement 405 en GET avant la configuration. Vérifiez APP_URL et la protection du déploiement.',
    );
  const stripe = new Stripe(key, { maxNetworkRetries: 2 });
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  if (endpoints.data.some((e) => e.url === hookUrl))
    throw new Error(
      'Un webhook existe déjà pour cette URL. Récupérez son secret original et configurez les variables sans en créer un autre.',
    );
  // Durable private checkpoint before creating a webhook: its secret is returned only once.
  await writeFile(output, '# Vidi billing setup checkpoint; never commit this file.\n', {
    flag: 'wx',
    mode: 0o600,
  });
  const values = { APP_URL: origin.origin, STRIPE_SECRET_KEY: key };
  for (const [plan, price] of plans) {
    const lookup = `vidi_${plan.toLowerCase()}_eur_monthly_v1`;
    const existing = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 2 });
    let selected = existing.data[0];
    if (!selected)
      selected = await stripe.prices.create(
        {
          currency: 'eur',
          unit_amount: price * 100,
          recurring: { interval: 'month' },
          lookup_key: lookup,
          product_data: { name: `Vidi ${plan}`, metadata: { application: 'vidi' } },
        },
        { idempotencyKey: lookup },
      );
    if (
      existing.data.length > 1 ||
      selected.currency !== 'eur' ||
      selected.unit_amount !== price * 100 ||
      selected.recurring?.interval !== 'month' ||
      selected.recurring.interval_count !== 1
    )
      throw new Error(
        'Un lookup_key Vidi correspond à un autre tarif. Aucun tarif existant n’a été modifié.',
      );
    values[`STRIPE_PRICE_${plan}`] = selected.id;
  }
  const portal = await stripe.billingPortal.configurations.create(
    {
      name: 'Vidi customer portal',
      default_return_url: origin.origin,
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
      },
    },
    { idempotencyKey: 'vidi_billing_portal_v1' },
  );
  values.STRIPE_PORTAL_CONFIGURATION = portal.id;
  const endpoint = await stripe.webhookEndpoints.create(
    { url: hookUrl, enabled_events: events, metadata: { application: 'vidi' } },
    { idempotencyKey: 'vidi_webhook_' + origin.hostname },
  );
  if (!endpoint.secret)
    throw new Error(
      'Le secret du webhook est indisponible. Récupérez sa configuration dans Stripe.',
    );
  values.STRIPE_WEBHOOK_SECRET = endpoint.secret;
  await writeFile(
    output,
    Object.entries(values)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('\n') + '\n',
    { mode: 0o600 },
  );
  console.info('BILLING_CONFIGURATION_SAVED', {
    environment: key.includes('_test_') ? 'test' : 'live',
    file: '.env.billing',
    keys: Object.keys(values),
  });
} catch (e) {
  // Provider errors may include request details; expose only explicitly authored local messages.
  console.error(
    e.constructor === Error
      ? e.message
      : 'Stripe setup failed. Check key permissions and the private checkpoint file; no payment was created.',
  );
  process.exitCode = 1;
}
