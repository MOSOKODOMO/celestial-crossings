import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createPayments, verifySignature } from '../supabase/functions/_shared/payments.mjs';
const A = 'aaaaaaaa-1111-4111-8111-111111111111', B = 'bbbbbbbb-2222-4222-8222-222222222222';
const id = 'cs_test_1234567890abcdef', requestId = 'cccccccc-3333-4333-8333-333333333333';
const timestamp = 1795210000;
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
function fixture(overrides = {}) {
  const env = { SITE_URL: 'https://moojai.example/site/', SUPABASE_URL: 'https://demo.supabase.co', SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_fixture"}', SUPABASE_SECRET_KEYS: '{"default":"sb_secret_fixture"}', STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', PAYMENTS_ENABLED: 'true', STRIPE_PRICE_CARDWALLPAPER: 'price_fixture', ...overrides };
  const state = { calls: [], records: new Map(), authStatus: 200, dbStatus: 201,
    user: { id: A, email: 'buyer@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' },
    price: { id: 'price_fixture', active: true, type: 'one_time', currency: 'thb', unit_amount: 4900 },
    session: { id, mode: 'payment', status: 'complete', payment_status: 'paid', client_reference_id: A, currency: 'thb', amount_total: 4900,
      metadata: { app: 'moojai', user_id: A, product: 'cardWallpaper', price_id: 'price_fixture' },
      line_items: { data: [{ quantity: 1, price: { id: 'price_fixture', currency: 'thb', unit_amount: 4900 } }], has_more: false } }
  };
  const fetch = async (url, options = {}) => {
    state.calls.push({ url, ...options });
    if (url.endsWith('/auth/v1/user')) return response(state.user, state.authStatus);
    if (url.includes('/prices/')) return response(state.price);
    if (url.endsWith('/checkout/sessions')) return response({ id, url: 'https://checkout.stripe.com/c/pay/' + id });
    if (url.includes('/checkout/sessions/')) return response(state.session);
    if (url.includes('/rest/v1/entitlements')) {
      assert.equal(options.headers.apikey, 'sb_secret_fixture');
      assert.equal(options.headers.Authorization, undefined, 'modern secret keys are not JWTs');
      assert.equal(options.headers.Prefer, 'resolution=ignore-duplicates,return=minimal');
      const row = JSON.parse(options.body);
      if (state.dbStatus === 201 && !state.records.has(row.stripe_session_id)) state.records.set(row.stripe_session_id, row);
      return new Response(null, { status: state.dbStatus });
    }
    throw new Error('Unexpected request: ' + url);
  };
  return { ...createPayments({ env: name => env[name], fetch, now: () => timestamp * 1000 }), state, env };
}
function request(body, headers = {}) { return new Request('https://demo.supabase.co/functions/v1/example', { method: 'POST', headers: { origin: 'https://moojai.example', authorization: 'Bearer fixture-user-token', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }); }
const body = { product: 'cardWallpaper', requestId, language: 'th' };
function eventRequest(session, type = 'checkout.session.completed', signature) {
  const payload = JSON.stringify({ type, data: { object: session } });
  const signed = createHmac('sha256', 'whsec_fixture').update(timestamp + '.' + payload).digest('hex');
  return new Request('https://demo.supabase.co/functions/v1/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': signature || `t=${timestamp},v1=${signed}` }, body: payload });
}
test('Thai checkout enforces ฿49, PromptPay/cards, locale, safe return URL and retry identity', async () => {
  const f = fixture();
  for (let i = 0; i < 2; i++) assert.equal((await f.checkout(request({ ...body, amount: 1, returnUrl: 'https://moojai.example.attacker.test/' }))).status, 200);
  const calls = f.state.calls.filter(c => c.url.endsWith('/checkout/sessions'));
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  const form = calls[0].body;
  assert.equal(form.get('line_items[0][price]'), 'price_fixture');
  assert.equal(form.get('payment_method_types[0]'), 'promptpay');
  assert.equal(form.get('payment_method_types[1]'), 'card');
  assert.equal(form.get('locale'), 'th');
  assert.equal(form.get('metadata[user_id]'), A);
  assert.equal(form.get('success_url'), 'https://moojai.example/site/payment.html?checkout=success&session_id={CHECKOUT_SESSION_ID}&lang=th');
  assert.ok(!form.toString().includes('attacker'));
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), null);
});
test('checkout rejects disabled sales, spoofed origin, anonymous users and invalid products', async () => {
  assert.equal((await fixture({ PAYMENTS_ENABLED: 'false' }).checkout(request(body))).status, 503);
  const f = fixture();
  assert.equal((await f.checkout(request(body, { origin: 'https://moojai.example.attacker.test' }))).status, 403);
  assert.equal((await f.checkout(request(body, { authorization: '' }))).status, 401);
  assert.equal((await f.checkout(request({ ...body, product: '__proto__' }))).status, 400);
  assert.equal((await f.checkout(request({ ...body, requestId: '' }))).status, 400);
  f.state.user.is_anonymous = true;
  assert.equal((await f.checkout(request(body))).status, 401);
  assert.equal(f.state.calls.filter(c => c.url.endsWith('/checkout/sessions')).length, 0);
});
test('wrong currency, amount, recurring or inactive prices cannot start checkout', async () => {
  for (const change of [{ currency: 'usd' }, { unit_amount: 9900 }, { type: 'recurring' }, { active: false }]) {
    const f = fixture(); Object.assign(f.state.price, change);
    assert.equal((await f.checkout(request(body))).status, 503);
    assert.ok(!f.state.calls.some(c => c.url.endsWith('/checkout/sessions')));
  }
});
test('status is private and a forged success redirect cannot grant access', async () => {
  const f = fixture(); f.state.session.metadata.user_id = B;
  assert.equal((await f.status(request({ sessionId: id }))).status, 404);
  assert.equal(f.state.records.size, 0);
  assert.equal((await f.status(request({ sessionId: '../../wrong', checkout: 'success' }))).status, 400);
});
test('unpaid, expired and failed sessions never grant an entitlement', async () => {
  for (const [status, intent, expected] of [['open', null, 'awaiting_payment'], ['expired', null, 'expired'], ['complete', 'requires_payment_method', 'failed'], ['complete', 'processing', 'processing']]) {
    const f = fixture(); Object.assign(f.state.session, { status, payment_status: 'unpaid', payment_intent: { status: intent } });
    assert.deepEqual(await (await f.status(request({ sessionId: id }))).json(), { state: expected });
    await f.webhook(eventRequest(f.state.session)); assert.equal(f.state.records.size, 0);
  }
});
test('paid return and duplicate/delayed webhooks record one verified purchase', async () => {
  const f = fixture();
  const requests = [f.status(request({ sessionId: id })), f.webhook(eventRequest(f.state.session)), f.webhook(eventRequest(f.state.session, 'checkout.session.async_payment_succeeded'))];
  for (const result of await Promise.all(requests)) assert.equal(result.status, 200);
  assert.equal(f.state.records.size, 1);
  assert.deepEqual(f.state.records.get(id), { user_id: A, product: 'cardWallpaper', stripe_session_id: id, amount_total: 4900, currency: 'thb' });
});
test('mismatched paid amount or line items are not fulfilled', async () => {
  for (const change of [{ amount_total: 1 }, { currency: 'usd' }, { line_items: { data: [], has_more: false } }]) {
    const f = fixture(); Object.assign(f.state.session, change);
    assert.equal((await f.webhook(eventRequest(f.state.session))).status, 400);
    assert.equal(f.state.records.size, 0);
  }
});
test('database failures are retryable and never display payment as recorded', async () => {
  const f = fixture(); f.state.dbStatus = 500;
  assert.equal((await f.webhook(eventRequest(f.state.session))).status, 503);
  assert.equal((await f.status(request({ sessionId: id }))).status, 503);
  assert.equal(f.state.records.size, 0);
  f.state.dbStatus = 201;
  assert.equal((await f.webhook(eventRequest(f.state.session))).status, 200);
  assert.equal(f.state.records.size, 1);
});
test('invalid, tampered, stale and nonnumeric signatures are rejected; rotation works', async () => {
  const payload = '{"test":true}', secret = 'whsec_fixture';
  const sig = createHmac('sha256', secret).update(timestamp + '.' + payload).digest('hex');
  const header = `t=${timestamp},v1=${'0'.repeat(64)},v1=${sig}`;
  assert.equal(await verifySignature(payload, header, secret, timestamp * 1000), true);
  assert.equal(await verifySignature(payload + ' ', header, secret, timestamp * 1000), false);
  assert.equal(await verifySignature(payload, header, secret, (timestamp + 301) * 1000), false);
  assert.equal(await verifySignature(payload, 't=NaN,v1=' + sig, secret, timestamp * 1000), false);
  assert.equal(await verifySignature(payload, header + ',t=' + timestamp, secret, timestamp * 1000), false);
  const f = fixture();
  assert.equal((await f.webhook(eventRequest(f.state.session, undefined, `t=${timestamp},v1=${'0'.repeat(64)}`))).status, 400);
  assert.equal(f.state.calls.length, 0);
});
