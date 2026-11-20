// Only public configuration reaches this module. Account tokens are obtained from the existing account API.
export async function request(path, { method = 'GET', body, signal } = {}) {
  const config = window.MOOJAI_CONFIG || {}, token = await window.MooJaiAccount?.getAccessToken();
  if (!token) throw new Error('signin');
  const response = await fetch(config.supabaseUrl.replace(/\/$/, '') + path, {
    method, signal: signal || AbortSignal.timeout(12000),
    headers: { apikey: config.supabaseAnonKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error(data?.error || 'network'); error.status = response.status; throw error; }
  return data;
}
export const rpc = (name, body = {}) => request('/rest/v1/rpc/' + name, { method: 'POST', body });
export async function collection() {
  const rows = await request('/rest/v1/charm_collection?select=card_id,quantity');
  return Object.fromEntries(rows.map(r => [r.card_id, r.quantity]));
}
