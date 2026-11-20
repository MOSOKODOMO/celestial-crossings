// Supabase Edge Function: create a Stripe Checkout session for a signed-in user.
// Deploy:  supabase functions deploy create-checkout
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... SITE_ORIGIN=https://mosokodomo.github.io
//          and one price per product, e.g. STRIPE_PRICE_CUSTOMWEEK=price_...
// The browser calls MooJaiAccount.startCheckout('customWeek'); this function checks
// the user's token, looks up the price on the server (never trusting a client
// price) and returns the Stripe Checkout URL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITE_ORIGIN = Deno.env.get('SITE_ORIGIN') ?? '';
const cors = {
  'Access-Control-Allow-Origin': SITE_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Please sign in first.' }, 401);

  const { product, returnUrl } = await req.json().catch(() => ({}));
  if (typeof product !== 'string' || !/^[a-zA-Z0-9]{1,40}$/.test(product)) return json({ error: 'Unknown product.' }, 400);
  const price = Deno.env.get(`STRIPE_PRICE_${product.toUpperCase()}`);
  if (!price) return json({ error: 'This item is not on sale yet.' }, 400);

  // Only send people back to our own site.
  const back = typeof returnUrl === 'string' && SITE_ORIGIN && returnUrl.startsWith(SITE_ORIGIN) ? returnUrl : SITE_ORIGIN;

  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    customer_email: user.email ?? '',
    'metadata[user_id]': user.id,
    'metadata[product]': product,
    success_url: `${back}?checkout=success`,
    cancel_url: `${back}?checkout=cancelled`,
    'payment_method_types[0]': 'card',
    // Add 'promptpay' (Thai baht prices) once enabled in the Stripe dashboard:
    // 'payment_method_types[1]': 'promptpay',
  });
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const session = await response.json();
  if (!response.ok) return json({ error: 'Checkout could not start. Please try again.' }, 502);
  return json({ url: session.url });
});
