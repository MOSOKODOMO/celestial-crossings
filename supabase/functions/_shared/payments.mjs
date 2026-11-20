// Server-only payment decisions. Amounts are integer satang; browser prices
// and success redirects are never accepted as evidence of payment.
const PRODUCT = 'cardWallpaper', AMOUNT = 4900;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION = /^cs_(?:test_|live_)?[A-Za-z0-9]{8,200}$/;
const encoder = new TextEncoder();
const fail = (code, status = 400) => { throw Object.assign(new Error(code), { status }); };
function key(env, modern, legacy) {
  try { const value = JSON.parse(env(modern) || '{}').default; if (value) return value; } catch {}
  return env(legacy) || '';
}
export function createPayments({ env, fetch: request = globalThis.fetch, now = Date.now }) {
  const site = new URL(env('SITE_URL') || 'https://mosokodomo.github.io/celestial-crossings/');
  if (site.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(site.hostname)) throw new Error('SITE_URL requires HTTPS');
  site.search = ''; site.hash = ''; site.pathname = site.pathname.replace(/\/?$/, '/');
  const returnPage = new URL('payment.html', site).href;
  const api = (env('SUPABASE_URL') || '').replace(/\/+$/, '');
  const publicKey = key(env, 'SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const serviceKey = key(env, 'SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  const secret = env('STRIPE_SECRET_KEY') || '';
  const cors = { 'Access-Control-Allow-Origin': site.origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  async function read(req) {
    const text = await req.text(); if (text.length > 4096) fail('invalid_request', 413);
    try { const body = JSON.parse(text); if (!body || typeof body !== 'object' || Array.isArray(body)) fail('invalid_request'); return body; }
    catch { fail('invalid_request'); }
  }
  async function stripe(path, options = {}) {
    if (!secret) fail('payments_unavailable', 503);
    const response = await request('https://api.stripe.com/v1/' + path, {
      ...options, headers: { Authorization: 'Bearer ' + secret, 'Stripe-Version': '2026-11-18.endive', ...options.headers }, signal: AbortSignal.timeout(15000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) fail('payment_service_unavailable', 502);
    return data;
  }
  async function user(req) {
    if (!api || !publicKey) fail('payments_unavailable', 503);
    const authorization = req.headers.get('authorization') || '';
    if (!/^Bearer \S+$/.test(authorization)) fail('signin', 401);
    const response = await request(api + '/auth/v1/user', { headers: { apikey: publicKey, Authorization: authorization }, signal: AbortSignal.timeout(10000) });
    const account = await response.json().catch(() => ({}));
    if (!response.ok || !UUID.test(account.id || '') || account.is_anonymous || !account.email_confirmed_at) fail('signin', 401);
    return account;
  }
  async function database(path, body) {
    if (!api || !serviceKey) fail('payments_unavailable', 503);
    const response = await request(api + '/rest/v1/' + path, {
      method: body ? 'POST' : 'GET', headers: { apikey: serviceKey,
        ...(serviceKey.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + serviceKey }),
        'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) fail('payment_record_unavailable', 503);
    return body ? null : response.json();
  }
  const ours = session => session?.metadata?.app === 'moojai' && session.metadata.product === PRODUCT;
  function validPaid(session) {
    const item = session.line_items?.data?.[0];
    return ours(session) && session.mode === 'payment' && session.status === 'complete' && session.payment_status === 'paid'
      && UUID.test(session.metadata.user_id || '') && session.client_reference_id === session.metadata.user_id
      && session.currency === 'thb' && session.amount_total === AMOUNT
      && session.line_items?.data?.length === 1 && !session.line_items.has_more && item.quantity === 1
      && /^price_[A-Za-z0-9]+$/.test(session.metadata.price_id || '')
      && item.price?.id === session.metadata.price_id && item.price?.currency === 'thb' && item.price?.unit_amount === AMOUNT;
  }
  async function retrieve(id) {
    if (!SESSION.test(id || '')) fail('invalid_session');
    return stripe('checkout/sessions/' + id + '?expand[]=line_items&expand[]=payment_intent');
  }
  async function fulfill(session) {
    if (!validPaid(session)) fail('invalid_paid_session');
    await database('entitlements?on_conflict=stripe_session_id', {
      user_id: session.metadata.user_id, product: PRODUCT, stripe_session_id: session.id,
      amount_total: session.amount_total, currency: session.currency
    });
  }
  function browser(handler) {
    return async req => {
      try {
        if (req.headers.has('origin') && req.headers.get('origin') !== site.origin) fail('origin', 403);
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        if (req.method !== 'POST') fail('method', 405);
        const account = await user(req);
        return json(await handler(await read(req), account));
      } catch (error) { return json({ error: error.status ? error.message : 'payment_service_unavailable' }, error.status || 503); }
    };
  }
  const checkout = browser(async (body, account) => {
    if (env('PAYMENTS_ENABLED') !== 'true') fail('payments_unavailable', 503);
    if (body.product !== PRODUCT || !UUID.test(body.requestId || '')) fail('invalid_request');
    const priceId = env('STRIPE_PRICE_CARDWALLPAPER') || '';
    if (!/^price_[A-Za-z0-9]+$/.test(priceId)) fail('payments_unavailable', 503);
    const price = await stripe('prices/' + priceId);
    if (!price.active || price.type !== 'one_time' || price.currency !== 'thb' || price.unit_amount !== AMOUNT || price.recurring) fail('price_not_ready', 503);
    const language = body.language === 'en' ? 'en' : 'th';
    const form = new URLSearchParams({ mode: 'payment', locale: language,
      'line_items[0][price]': priceId, 'line_items[0][quantity]': '1',
      'payment_method_types[0]': 'promptpay', 'payment_method_types[1]': 'card',
      client_reference_id: account.id, customer_email: account.email,
      'metadata[app]': 'moojai', 'metadata[user_id]': account.id, 'metadata[product]': PRODUCT, 'metadata[price_id]': priceId,
      success_url: returnPage + '?checkout=success&session_id={CHECKOUT_SESSION_ID}&lang=' + language,
      cancel_url: returnPage + '?checkout=cancelled&lang=' + language
    });
    const session = await stripe('checkout/sessions', { method: 'POST', body: form,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': 'moojai:' + account.id + ':' + body.requestId } });
    let url; try { url = new URL(session.url); } catch { fail('payment_service_unavailable', 502); }
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || !SESSION.test(session.id || '')) fail('payment_service_unavailable', 502);
    return { url: url.href, sessionId: session.id };
  });
  const status = browser(async (body, account) => {
    const session = await retrieve(body.sessionId);
    if (!ours(session) || session.metadata.user_id !== account.id || session.client_reference_id !== account.id) fail('not_found', 404);
    if (session.payment_status === 'paid') {
      // This also recovers delayed webhooks; Stripe is queried before writing.
      await fulfill(session);
      return { state: 'paid', product: PRODUCT, amount: AMOUNT, currency: 'thb' };
    }
    if (session.status === 'expired') return { state: 'expired' };
    if (session.payment_intent?.status === 'canceled' || (session.status === 'complete' && session.payment_intent?.status === 'requires_payment_method')) return { state: 'failed' };
    return { state: session.status === 'open' ? 'awaiting_payment' : 'processing' };
  });
  const webhook = async req => {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    try {
      const signingSecret = env('STRIPE_WEBHOOK_SECRET');
      if (!signingSecret) fail('payments_unavailable', 503);
      const payload = await req.text(); if (payload.length > 262144) fail('invalid_request', 413);
      if (!await verifySignature(payload, req.headers.get('stripe-signature') || '', signingSecret, now())) fail('invalid_signature');
      let event; try { event = JSON.parse(payload); } catch { fail('invalid_request'); }
      if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return json({ received: true });
      if (!ours(event.data?.object)) return json({ received: true });
      const session = await retrieve(event.data.object.id);
      if (session.payment_status === 'paid') await fulfill(session);
      return json({ received: true });
    } catch (error) { return json({ error: error.status ? error.message : 'payment_service_unavailable' }, error.status || 503); }
  };
  return { checkout, status, webhook };
}
export async function verifySignature(payload, header, secret, now = Date.now()) {
  const parts = header.split(',').map(part => part.trim().split('='));
  const timestamps = parts.filter(([name]) => name === 't').map(([, value]) => value);
  if (timestamps.length !== 1 || !/^\d{1,12}$/.test(timestamps[0])) return false;
  const timestamp = Number(timestamps[0]);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(timestamps[0] + '.' + payload)));
  return parts.filter(([name]) => name === 'v1').some(([, value]) => {
    if (!/^[0-9a-f]{64}$/.test(value || '')) return false;
    let difference = 0;
    for (let i = 0; i < mac.length; i++) difference |= mac[i] ^ parseInt(value.slice(i * 2, i * 2 + 2), 16);
    return difference === 0;
  });
}
