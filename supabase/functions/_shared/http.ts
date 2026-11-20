const url = Deno.env.get('SUPABASE_URL')!;
function key(modern: string, legacy: string) {
  try { const value=JSON.parse(Deno.env.get(modern)||'{}').default;if(value)return value; } catch {}
  return Deno.env.get(legacy)||'';
}
const anon = key('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
const service = key('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
const origins = (Deno.env.get('SITE_ORIGIN') || 'https://mosokodomo.github.io').split(',').map(s => s.trim());
export function headers(req: Request) {
  const origin = req.headers.get('origin') || '';
  return { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : origins[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
}
export function json(req: Request, value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: headers(req) }); }
export async function input(req: Request) {
  if (req.method !== 'POST') throw new Error('method');
  const origin = req.headers.get('origin'); if (origin && !origins.includes(origin)) throw new Error('origin');
  const text = await req.text(); if (text.length > 4096) throw new Error('invalid_request');
  let body;
  try { body = JSON.parse(text); } catch { throw new Error('invalid_request'); }
  if (!body || typeof body !== 'object' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId || '')) throw new Error('invalid_request');
  return body;
}
export async function user(req: Request) {
  const token = req.headers.get('authorization'); if (!token?.startsWith('Bearer ')) throw new Error('signin');
  const response = await fetch(url + '/auth/v1/user', { headers: { apikey: anon, Authorization: token }, signal: AbortSignal.timeout(10000) });
  const account = await response.json();
  if (!response.ok || !account.id || account.is_anonymous || !account.email_confirmed_at) throw new Error('signin');
  return account.id as string;
}
export async function db(path: string, body?: unknown) {
  const response = await fetch(url + '/rest/v1/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { apikey: service, ...(service.startsWith('sb_secret_')?{}:{Authorization: 'Bearer ' + service}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message?.includes('version_conflict') ? 'version_conflict' : data.message?.includes('daily_limit') ? 'daily_limit' : 'database');
  return data;
}
export function failure(req: Request, error: unknown) {
  const reason = error instanceof Error ? error.message : 'server';
  const publicErrors: Record<string, number> = { signin: 401, origin: 403, method: 405, invalid_request: 400, invalid_preferences: 400, preferences_locked: 409, daily_limit: 429, version_conflict: 409 };
  return json(req, { error: reason in publicErrors ? reason : 'server' }, publicErrors[reason] || 500);
}
