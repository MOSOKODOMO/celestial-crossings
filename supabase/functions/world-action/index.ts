import '../_shared/world-core.js';
import { input, user, db, json, failure, headers } from '../_shared/http.ts';
declare global { var WorldCore: any; }
const W = globalThis.WorldCore;
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: headers(req) });
  try {
    const body = await input(req), userId = await user(req);
    if (!['visit','pray','pat','feed','lantern','lotus'].includes(body.action)) throw new Error('invalid_request');
    // Text intentions never enter the request; reject unexpected fields too.
    if (Object.keys(body).some(k => !['action','requestId'].includes(k))) throw new Error('invalid_request');
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await db(`world_state?user_id=eq.${userId}&select=ledger,version`), row = rows[0];
      const cards = await db(`charm_collection?user_id=eq.${userId}&select=card_id,quantity`);
      const quantities = Object.fromEntries(cards.map((c: any) => [c.card_id, c.quantity]));
      const ledger = W.restoreLedger(row?.ledger), now = new Date(); // Edge runtime day boundary: UTC.
      let result;
      if (body.action === 'visit') result = W.claimVisit(ledger, now);
      else if (body.action === 'pray') result = W.pray(ledger, now);
      else if (body.action === 'pat' || body.action === 'feed') result = cards.length ? W.carePet(ledger, now) : { ledger, gained: 0, ok: false };
      else result = W.makeOffering(ledger, quantities, body.action, now.getTime());
      if (body.action === 'lotus' && result.ok) result.lotus = { key: crypto.randomUUID(), x: 90 + Math.random() * 7, z: 49 + Math.random() * 6, expires: Date.now() + 3600000 };
      try { return json(req, await db('rpc/commit_world_action', { p_user: userId, p_request: body.requestId, p_version: row?.version || 0, p_result: result })); }
      catch (error) { if (!(error instanceof Error) || error.message !== 'version_conflict' || attempt === 4) throw error; }
    }
    throw new Error('version_conflict');
  } catch (error) { return failure(req, error); }
});
