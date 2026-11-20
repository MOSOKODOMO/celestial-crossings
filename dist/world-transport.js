import { request, rpc } from './world-api.js';
const W = window.WorldCore;
export function previewTransport({ id, receive, status }) {
  const channel = new BroadcastChannel('moojai-world-preview-v1');
  let closed = false;
  channel.onmessage = event => {
    const p = event.data;
    if (p && p.id !== id && typeof p.id === 'string' && /^[a-zA-Z0-9-]{6,64}$/.test(p.id)) receive(p, p.id, null);
  };
  status('preview');
  return { send(packet) { if (!closed) channel.postMessage(packet); }, close() { closed = true; channel.close(); }, async pulse() {} };
}

let vendorPromise;
function loadVendor() {
  if (!vendorPromise) vendorPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'vendor/supabase.js';
    script.onload = resolve; script.onerror = () => reject(new Error('network')); document.head.appendChild(script);
  });
  return vendorPromise;
}

// Shared room Presence is discovery only. Authoritative membership comes from world_members.
// State/chat are read from per-user topics; RLS allows only that account to publish to its topic.
export async function onlineTransport({ id, name, receive, status }) {
  await loadVendor();
  const config = window.MOOJAI_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
    accessToken: () => window.MooJaiAccount.getAccessToken(), auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 12 } }
  });
  await client.realtime.setAuth(await window.MooJaiAccount.getAccessToken());
  const membership = await rpc('world_join', { p_name: name });
  const room = membership.room, roomTopic = `world:lobby-${room}`;
  const channels = new Map(), rosters = new Map();
  let closed = false, latestState = null, ownReady = false, roomReady = false, presenceKey = '', lastPresence = 0;
  function joined() { if (ownReady && roomReady) status('online', room); }
  function peer(userId) {
    const c = client.channel(`${roomTopic}:${userId}`, { config: { private: true, broadcast: { self: false, ack: false } } });
    channels.set(userId, c);
    c.on('broadcast', { event: 'world' }, ({ payload }) => {
      if (closed || userId === id || !rosters.has(userId)) return;
      if (!payload || payload.id !== userId) return;
      receive(payload, userId, rosters.get(userId));
    }).subscribe(s => {
      if (userId === id) {
        ownReady = s === 'SUBSCRIBED';
        if (ownReady && latestState) c.send({ type: 'broadcast', event: 'world', payload: latestState });
        if (!ownReady) status('offline'); else joined();
      }
    });
    return c;
  }
  const own = peer(id);
  const lobby = client.channel(roomTopic, { config: { private: true, presence: { key: id } } });
  lobby.on('presence', { event: 'sync' }, () => { /* UI counts verified state snapshots, never untrusted Presence keys. */ });
  lobby.subscribe(async s => {
    roomReady = s === 'SUBSCRIBED';
    if (roomReady) { await lobby.track({ id, name: W.validName(name), pet: latestState?.state?.pet || null }); joined(); }
    else status('offline');
  });
  async function pulse() {
    if (closed) return;
    try { await rpc('world_touch'); }
    catch (error) {
      const renewed = await rpc('world_join', { p_name: name });
      if (renewed.room !== room) throw new Error('room_changed');
    }
    // Refresh JWT after renewing the lease, including after a backgrounded tab.
    await client.realtime.setAuth(await window.MooJaiAccount.getAccessToken());
    const members = await rpc('world_members');
    if (closed) return;
    const wanted = new Set(members.map(m => m.user_id));
    for (const m of members) {
      rosters.set(m.user_id, m.card_ids || []);
      if (!channels.has(m.user_id)) peer(m.user_id);
    }
    for (const [userId, c] of channels) if (userId !== id && !wanted.has(userId)) { client.removeChannel(c); channels.delete(userId); rosters.delete(userId); receive({ type: 'leave', id: userId }, userId, []); }
    if (ownReady) joined();
  }
  await pulse();
  return {
    room,
    send(packet) {
      if (closed) return;
      if (packet.type === 'state' || packet.type === 'hello') {
        latestState = { ...packet, type: 'state' };
        const presence = { id, name, pet: packet.state.pet, followers: packet.state.followers, glow: packet.state.glow };
        const key = JSON.stringify(presence);
        if (roomReady && (key !== presenceKey || Date.now() - lastPresence >= 3000)) {
          presenceKey = key; lastPresence = Date.now();
          lobby.track(presence).catch(() => status('offline'));
        }
      }
      if (ownReady) own.send({ type: 'broadcast', event: 'world', payload: packet }).catch(() => status('offline'));
    },
    pulse,
    async close() { closed = true; await client.removeAllChannels(); client.realtime.disconnect(); await rpc('world_leave').catch(() => {}); }
  };
}
