// Pure orchestration, injected engine and database. The committed engine copy is byte-identical.
export async function drawForUser({ engine, db, userId, requestId, preferences, allowance = 5 }) {
  if (!engine.validatePreferences(preferences)) throw new Error('invalid_preferences');
  const previous = await db(`draw_history?user_id=eq.${userId}&request_id=eq.${requestId}&select=state,result`);
  if (previous.length) return { ...previous[0], replayed: true };
  for (let attempt = 0; attempt < 5; attempt++) {
    const rows = await db(`draw_state?user_id=eq.${userId}&select=state,version`);
    const row = rows[0], state = row ? engine.restore(JSON.stringify(row.state)) : engine.initialState();
    if (row && state.total !== row.state.total) throw new Error('database');
    const locked = state.cycle.length > 0 && state.cycle.length < 10;
    if (locked && [...state.preferences].sort().join() !== [...preferences].sort().join()) throw new Error('preferences_locked');
    if (!locked) state.preferences = preferences;
    const outcome = engine.draw(state);
    try { return await db('rpc/commit_draw', { p_user: userId, p_request: requestId, p_version: row?.version || 0, p_state: outcome.state, p_result: outcome.result, p_allowance: Math.max(0, Math.min(100, allowance)) }); }
    catch (error) { if (error.message !== 'version_conflict' || attempt === 4) throw error; }
  }
}
