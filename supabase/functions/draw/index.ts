import '../_shared/collect-engine.js';
import { drawForUser } from '../_shared/draw-service.mjs';
import { input, user, db, json, failure, headers } from '../_shared/http.ts';
declare global { var CollectEngine: any; }
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: headers(req) });
  try {
    const body = await input(req), userId = await user(req);
    const raw = Number(Deno.env.get('FREE_DRAWS_PER_DAY') || 5);
    const result = await drawForUser({ engine: globalThis.CollectEngine, db, userId, requestId: body.requestId, preferences: body.preferences, allowance: Number.isSafeInteger(raw) ? raw : 5 });
    return json(req, result);
  } catch (error) { return failure(req, error); }
});
