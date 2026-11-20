// Server-only payment decisions. Amounts are integer satang; browser prices
// and success redirects are never accepted as evidence of payment.
const PRODUCT = 'cardWallpaper', AMOUNT = 4900;
const CARD_NAMES = {'growth-C':['The New Leaf','ใบไม้ผลิใหม่'],'growth-R':['The Open Door','ประตูที่เปิดอยู่'],'growth-S':['The Becoming','การเติบโต'],'growth-SR':['The Phoenix','ฟีนิกซ์'],'growth-SSR':['Phra Chan','พระจันทร์']};
const CARDS = new Set(Object.keys(CARD_NAMES));
const BUCKET = 'moojai-paid';
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
  const serviceHeaders = () => ({ apikey: serviceKey, ...(serviceKey.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + serviceKey }) });
  async function database(path, body) {
    if (!api || !serviceKey) fail('payments_unavailable', 503);
    const response = await request(api + '/rest/v1/' + path, {
      method: body ? 'POST' : 'GET', headers: { ...serviceHeaders(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) fail('payment_record_unavailable', 503);
    return response.json();
  }
  const ours = session => session?.metadata?.app === 'moojai' && session.metadata.product === PRODUCT;
  function validPaid(session) {
    const item = session.line_items?.data?.[0];
    return ours(session) && session.mode === 'payment' && session.status === 'complete' && session.payment_status === 'paid'
      && UUID.test(session.metadata.user_id || '') && session.client_reference_id === session.metadata.user_id && CARDS.has(session.metadata.card_id)
      && session.currency === 'thb' && session.amount_total === AMOUNT
      && session.line_items?.data?.length === 1 && !session.line_items.has_more && item.quantity === 1
      && /^price_[A-Za-z0-9]+$/.test(session.metadata.price_id || '')
      && item.price?.id === session.metadata.price_id && item.price?.currency === 'thb' && item.price?.unit_amount === AMOUNT;
  }
  async function retrieve(id) {
    if (!SESSION.test(id || '')) fail('invalid_session');
    return stripe('checkout/sessions/' + id + '?expand[]=line_items&expand[]=payment_intent.latest_charge');
  }
  const intentId = session => typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const refunded = session => session.payment_intent?.latest_charge?.refunded === true;
  async function fulfill(session) {
    if (!validPaid(session)) fail('invalid_paid_session');
    if (refunded(session)) { await database('rpc/revoke_card_bundle',{p_intent:intentId(session)}); return {revoked:true}; }
    return database('rpc/fulfill_card_bundle', {p_user:session.metadata.user_id,p_session:session.id,p_intent:intentId(session),p_card:session.metadata.card_id});
  }
  async function signedAsset(cardId, kind) {
    const path = kind === 'card' ? `cards/${cardId}.webp` : `wallpapers/${cardId}.png`;
    const response = await request(`${api}/storage/v1/object/sign/${BUCKET}/${path}`, {
      method:'POST',headers:{...serviceHeaders(),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300}),signal:AbortSignal.timeout(10000)
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok || typeof data.signedURL !== 'string') fail('download_unavailable',503);
    const url = new URL(api + '/storage/v1' + data.signedURL);
    if (url.origin !== new URL(api).origin || !url.pathname.startsWith(`/storage/v1/object/sign/${BUCKET}/`)) fail('download_unavailable',503);
    url.searchParams.set('download',`MooJai-${cardId}-${kind}.${kind==='card'?'webp':'png'}`);
    return url.href;
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
    if (body.product !== PRODUCT || !UUID.test(body.requestId || '') || !CARDS.has(body.cardId)) fail('invalid_request');
    // Verify both private assets can be served before accepting a new purchase.
    await Promise.all(['card','wallpaper'].map(kind=>signedAsset(body.cardId,kind)));
    const priceId = env('STRIPE_PRICE_CARDWALLPAPER') || '';
    if (!/^price_[A-Za-z0-9]+$/.test(priceId)) fail('payments_unavailable', 503);
    const price = await stripe('prices/' + priceId);
    if (!price.active || price.type !== 'one_time' || price.currency !== 'thb' || price.unit_amount !== AMOUNT || price.recurring) fail('price_not_ready', 503);
    const language = body.language === 'en' ? 'en' : 'th';
    const form = new URLSearchParams({ mode: 'payment', locale: language,
      'line_items[0][price]': priceId, 'line_items[0][quantity]': '1',
      'payment_method_types[0]': 'promptpay', 'payment_method_types[1]': 'card',
      client_reference_id: account.id, customer_email: account.email,
      'metadata[app]': 'moojai', 'metadata[user_id]': account.id, 'metadata[product]': PRODUCT, 'metadata[price_id]': priceId, 'metadata[card_id]':body.cardId,
      'custom_text[submit][message]':language==='th'?`${CARD_NAMES[body.cardId][1]}: การ์ดพร้อมวอลเปเปอร์โทรศัพท์ที่เข้าคู่กัน`:`${CARD_NAMES[body.cardId][0]}: card + matching phone wallpaper`,
      success_url: returnPage + '?checkout=success&session_id={CHECKOUT_SESSION_ID}&lang=' + language,
      cancel_url: returnPage + '?checkout=cancelled&card=' + body.cardId + '&lang=' + language
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
      const result=await fulfill(session);
      if(result.revoked)return {state:'refunded'};
      return { state: 'paid', product: PRODUCT, cardId:session.metadata.card_id, amount: AMOUNT, currency: 'thb' };
    }
    if (session.status === 'expired') return { state: 'expired' };
    if (session.payment_intent?.status === 'canceled' || (session.status === 'complete' && session.payment_intent?.status === 'requires_payment_method')) return { state: 'failed' };
    return { state: session.status === 'open' ? 'awaiting_payment' : 'processing' };
  });
  const downloads = browser(async(body,account)=>{
    if(body.action==='list')return {purchases:await database(`entitlements?select=stripe_session_id,card_id,granted_at&user_id=eq.${account.id}&product=eq.cardWallpaper&revoked_at=is.null&card_id=not.is.null&order=granted_at.desc`)};
    if(!SESSION.test(body.sessionId||'')||!['card','wallpaper'].includes(body.kind))fail('invalid_request');
    const rows=await database(`entitlements?select=card_id&user_id=eq.${account.id}&stripe_session_id=eq.${body.sessionId}&product=eq.cardWallpaper&revoked_at=is.null`);
    if(!rows.length||!CARDS.has(rows[0].card_id))fail('not_found',404);
    return {url:await signedAsset(rows[0].card_id,body.kind),expiresIn:300};
  });
  const webhook = async req => {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    try {
      const signingSecret = env('STRIPE_WEBHOOK_SECRET');
      if (!signingSecret) fail('payments_unavailable', 503);
      const payload = await req.text(); if (payload.length > 262144) fail('invalid_request', 413);
      if (!await verifySignature(payload, req.headers.get('stripe-signature') || '', signingSecret, now())) fail('invalid_signature');
      let event; try { event = JSON.parse(payload); } catch { fail('invalid_request'); }
      if(event.type==='charge.refunded'){
        if(!/^ch_[A-Za-z0-9]+$/.test(event.data?.object?.id||''))fail('invalid_request');
        const charge=await stripe('charges/'+event.data.object.id);
        if(charge.refunded&&/^pi_[A-Za-z0-9]+$/.test(charge.payment_intent||''))await database('rpc/revoke_card_bundle',{p_intent:charge.payment_intent});
        return json({received:true});
      }
      if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) return json({ received: true });
      if (!ours(event.data?.object)) return json({ received: true });
      const session = await retrieve(event.data.object.id);
      if (session.payment_status === 'paid') await fulfill(session);
      return json({ received: true });
    } catch (error) { return json({ error: error.status ? error.message : 'payment_service_unavailable' }, error.status || 503); }
  };
  return { checkout, status, webhook, downloads };
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
