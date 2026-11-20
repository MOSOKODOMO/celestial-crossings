// Supabase Edge Function: receive Stripe's checkout.session.completed event and
// record the purchase in public.entitlements. This is the only code that grants
// paid access — the browser's success redirect is never trusted.
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// Stripe dashboard → Developers → Webhooks → endpoint:
//   https://<project>.supabase.co/functions/v1/stripe-webhook  (event: checkout.session.completed)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const encoder = new TextEncoder();
async function verify(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const timestamp = parts['t'];
  const signatures = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // 5-minute tolerance
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return signatures.some((sig) => sig.length === expected.length && [...sig].every((c, i) => c === expected[i]));
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const ok = await verify(payload, req.headers.get('stripe-signature') ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  if (!ok) return new Response('Invalid signature', { status: 400 });

  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });
  const session = event.data.object;
  if (session.payment_status !== 'paid') return new Response('not paid yet', { status: 200 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.from('entitlements').upsert({
    user_id: session.metadata?.user_id ?? session.client_reference_id,
    product: session.metadata?.product ?? 'unknown',
    stripe_session_id: session.id,
    amount_total: session.amount_total,
    currency: session.currency,
  }, { onConflict: 'stripe_session_id' });
  if (error) return new Response('database error', { status: 500 }); // Stripe will retry
  return new Response('ok', { status: 200 });
});
