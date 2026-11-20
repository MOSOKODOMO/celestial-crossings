// MooJai World — pure game rules (no DOM). Shared by the browser and Node tests.
// Map and collision, pets from an owned collection, stardust, chat safety and
// the Wishing Pavilion rules. Nothing here promises luck: rituals are for
// reflection, and offerings are paid only in stardust earned inside the game.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorldCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------- map ----------
  const WORLD = { width: 2400, height: 1600, spawn: { x: 1180, y: 1060 } };
  const zones = [
    { id: 'pavilion', th: 'ศาลาตั้งจิต', en: 'Wishing Pavilion', x: 960, y: 140, w: 480, h: 420 },
    { id: 'pond', th: 'สระบัวจันทร์', en: 'Moonlit Lotus Pond', x: 1520, y: 760, w: 720, h: 560 },
    { id: 'grove', th: 'ป่าหิ่งห้อย', en: 'Firefly Grove', x: 80, y: 120, w: 760, h: 720 },
    { id: 'garden', th: 'สวนดาว', en: 'Star Garden', x: 120, y: 960, w: 820, h: 560 },
    { id: 'meadow', th: 'ทุ่งพระจันทร์', en: 'Moon Meadow', x: 0, y: 0, w: 2400, h: 1600 }
  ];
  // Water and buildings block movement; pets walk around them.
  const pond = { cx: 1880, cy: 1040, rx: 300, ry: 190 };
  const pavilion = { x: 1060, y: 190, w: 280, h: 190, door: { x: 1200, y: 452, r: 120 } };
  const trees = [
    [180, 230, 46], [330, 170, 40], [520, 260, 52], [690, 180, 38], [250, 420, 44], [440, 470, 50], [640, 420, 42],
    [170, 640, 40], [360, 700, 46], [600, 650, 40], [780, 560, 36], [1560, 210, 44], [1760, 300, 50], [1980, 200, 42],
    [2210, 330, 46], [2280, 560, 40], [1620, 520, 36], [2240, 1420, 46], [1500, 1460, 40], [880, 1480, 42], [60, 1500, 40]
  ].map(([x, y, r]) => ({ x, y, r }));
  const rocks = [[860, 900, 22], [1430, 640, 18], [1010, 1340, 24], [2100, 640, 20], [700, 1180, 18]].map(([x, y, r]) => ({ x, y, r }));
  const lanterns = [[1080, 520], [1320, 520], [1020, 700], [1380, 700], [600, 1080], [1560, 860], [2210, 860], [420, 1300], [1700, 1300]].map(([x, y]) => ({ x, y }));
  const flowerBeds = [[280, 1080, 110], [560, 1220, 90], [300, 1370, 80], [760, 1060, 70]].map(([x, y, r]) => ({ x, y, r }));

  function zoneAt(x, y) { return zones.find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) || zones[zones.length - 1]; }
  function blocked(x, y, r = 16) {
    if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
    const dx = (x - pond.cx) / (pond.rx + r * 0.4), dy = (y - pond.cy) / (pond.ry + r * 0.4);
    if (dx * dx + dy * dy < 1) return true;
    if (x > pavilion.x - r && x < pavilion.x + pavilion.w + r && y > pavilion.y - r && y < pavilion.y + pavilion.h + r * 0.3) return true;
    for (const o of trees) if (Math.hypot(x - o.x, y - o.y) < o.r * 0.55 + r) return true;
    for (const o of rocks) if (Math.hypot(x - o.x, y - o.y) < o.r + r) return true;
    return false;
  }
  // Move with sliding collision: try the full step, then each axis on its own.
  function step(pos, dx, dy, speed, dt, r = 16) {
    if (![pos.x, pos.y, dx, dy, speed, dt].every(Number.isFinite) || speed < 0 || dt <= 0) return { ...pos, moved: false };
    const len = Math.hypot(dx, dy);
    if (!len) return { x: pos.x, y: pos.y, moved: false };
    // Subdivide long frames so a pet cannot tunnel through a tree or pond.
    const count = Math.ceil(speed * Math.min(dt, .25) / Math.max(4, r * .7));
    if (count > 1) {
      let p = pos, moved = false;
      for (let i = 0; i < count; i++) { const n = step(p, dx, dy, speed, Math.min(dt, .25) / count, r); moved ||= n.moved; p = n; }
      return { x: p.x, y: p.y, moved };
    }
    const sx = dx / len * speed * dt, sy = dy / len * speed * dt;
    if (!blocked(pos.x + sx, pos.y + sy, r)) return { x: pos.x + sx, y: pos.y + sy, moved: true };
    if (!blocked(pos.x + sx, pos.y, r)) return { x: pos.x + sx, y: pos.y, moved: true };
    if (!blocked(pos.x, pos.y + sy, r)) return { x: pos.x, y: pos.y + sy, moved: true };
    return { x: pos.x, y: pos.y, moved: false };
  }
  function nearPavilion(x, y) { return Math.hypot(x - pavilion.door.x, y - pavilion.door.y) < pavilion.door.r; }
  function clampToWorld(p) { return { x: Math.min(WORLD.width - 20, Math.max(20, p.x)), y: Math.min(WORLD.height - 20, Math.max(20, p.y)) }; }

  // ---------- pets ----------
  const species = { love: 'bunny', career: 'tiger', wealth: 'kitten', wellbeing: 'capybara', connection: 'elephant', growth: 'deer' };
  const speciesNames = {
    bunny: { th: 'กระต่ายจันทร์', en: 'Moon bunny' }, tiger: { th: 'ลูกเสือน้อย', en: 'Tiger cub' },
    kitten: { th: 'แมวทองน้อย', en: 'Golden kitten' }, capybara: { th: 'คาปิบาราน้อย', en: 'Baby capybara' },
    elephant: { th: 'ช้างน้อย', en: 'Baby elephant' }, deer: { th: 'กวางน้อย', en: 'Baby deer' }
  };
  const rankOrder = ['C', 'R', 'S', 'SR', 'SSR'];
  const stardustValue = { C: 1, R: 3, S: 10, SR: 40, SSR: 150 };
  const cardPattern = /^(love|career|wealth|wellbeing|connection|growth)-(C|R|S|SR|SSR)$/;

  function parseCard(cardId) {
    const m = cardPattern.exec(String(cardId || ''));
    return m ? { cardId: m[0], category: m[1], rank: m[2], species: species[m[1]] } : null;
  }
  // quantities: { 'love-C': 3, ... } → pets sorted rarest first.
  function petsFromQuantities(quantities) {
    return Object.entries(quantities || {})
      .map(([cardId, q]) => { const p = parseCard(cardId); return p && Number.isSafeInteger(q) && q > 0 ? { ...p, quantity: q, level: Math.min(10, q) } : null; })
      .filter(Boolean)
      .sort((a, b) => rankOrder.indexOf(b.rank) - rankOrder.indexOf(a.rank) || b.quantity - a.quantity || a.cardId.localeCompare(b.cardId));
  }
  // The collector's local save keeps the latest 1,000 draws in `history`.
  function quantitiesFromHistory(history) {
    const out = {};
    for (const item of Array.isArray(history) ? history : []) if (parseCard(item && item.cardId)) out[item.cardId] = (out[item.cardId] || 0) + 1;
    return out;
  }
  function duplicateStardust(quantities) {
    let total = 0;
    for (const [cardId, q] of Object.entries(quantities || {})) { const p = parseCard(cardId); if (p && q > 1) total += (q - 1) * stardustValue[p.rank]; }
    return total;
  }

  // ---------- stardust ledger (earned in game only; never bought, never cashed out) ----------
  const rewards = { dailyVisit: 3, prayer: 5, petCare: 1, petCarePerDay: 5 };
  const offerings = {
    lantern: { cost: 10, hours: 24, th: 'จุดโคมแสงจันทร์', en: 'Light a moon lantern' },
    lotus: { cost: 25, hours: 1, th: 'ลอยดอกบัวดาว', en: 'Float a star lotus' }
  };
  function dateKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function freshLedger() { return { version: 1, earned: 0, spent: 0, lastVisit: '', lastPrayer: '', careDay: '', careCount: 0, glowUntil: 0 }; }
  function restoreLedger(raw) {
    try {
      const l = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const ok = l && l.version === 1 && [l.earned, l.spent, l.careCount, l.glowUntil].every(n => Number.isSafeInteger(n) && n >= 0) &&
        ['lastVisit', 'lastPrayer', 'careDay'].every(k => typeof l[k] === 'string') && l.spent <= l.earned + 100000;
      return ok ? { ...freshLedger(), ...l } : freshLedger();
    } catch { return freshLedger(); }
  }
  function balance(ledger, quantities) { return Math.max(0, ledger.earned + duplicateStardust(quantities) - ledger.spent); }
  function claimVisit(ledger, now = new Date()) {
    const day = dateKey(now);
    if (ledger.lastVisit === day) return { ledger, gained: 0 };
    return { ledger: { ...ledger, lastVisit: day, earned: ledger.earned + rewards.dailyVisit }, gained: rewards.dailyVisit };
  }
  function canPray(ledger, now = new Date()) { return ledger.lastPrayer !== dateKey(now); }
  function pray(ledger, now = new Date()) {
    if (!canPray(ledger, now)) return { ledger, gained: 0, ok: false };
    return { ledger: { ...ledger, lastPrayer: dateKey(now), earned: ledger.earned + rewards.prayer }, gained: rewards.prayer, ok: true };
  }
  function carePet(ledger, now = new Date()) {
    const day = dateKey(now);
    const count = ledger.careDay === day ? ledger.careCount : 0;
    if (count >= rewards.petCarePerDay) return { ledger: { ...ledger, careDay: day, careCount: count }, gained: 0 };
    return { ledger: { ...ledger, careDay: day, careCount: count + 1, earned: ledger.earned + rewards.petCare }, gained: rewards.petCare };
  }
  function makeOffering(ledger, quantities, kind, now = Date.now()) {
    const item = offerings[kind];
    if (!item) return { ok: false, reason: 'unknown', ledger };
    if (balance(ledger, quantities) < item.cost) return { ok: false, reason: 'balance', ledger };
    const next = { ...ledger, spent: ledger.spent + item.cost };
    if (kind === 'lantern') next.glowUntil = Math.max(ledger.glowUntil, now) + item.hours * 3600000;
    return { ok: true, ledger: next, item };
  }

  // Short reflections shown after praying. Encouragement only — no promised outcomes.
  const reflections = {
    love: [['ความรักเติบโตจากความใส่ใจเล็ก ๆ ลองส่งข้อความดี ๆ ถึงใครสักคนวันนี้', 'Love grows from small attention. Send someone a kind message today.'], ['ใจที่เปิดกว้างพอดี ๆ ช่วยให้คนที่ใช่เข้าใจเรามากขึ้น', 'A gently open heart helps the right people understand you.']],
    career: [['ก้าวเล็ก ๆ ที่ทำจริงวันนี้ มีความหมายกว่าแผนใหญ่ที่ยังไม่เริ่ม', 'One real small step today matters more than a big plan not yet begun.'], ['ตั้งใจกับงานหนึ่งอย่างให้เต็มที่ แล้วให้เวลาตัวเองได้พัก', 'Give one task your full attention, then let yourself rest.']],
    wealth: [['ลองสังเกตสิ่งที่มีอยู่แล้ว ความมั่นคงเริ่มจากนิสัยเล็ก ๆ ที่สม่ำเสมอ', 'Notice what you already have. Security starts with small, steady habits.'], ['ใช้จ่ายอย่างรู้ใจตัวเอง และแบ่งความใจดีให้คนรอบข้างบ้าง', 'Spend with awareness, and share a little kindness with others.']],
    wellbeing: [['หายใจลึก ๆ สามครั้ง ร่างกายและใจสมควรได้พักเหมือนกัน', 'Take three slow breaths. Your body and mind deserve rest too.'], ['วันนี้ไม่ต้องสมบูรณ์แบบ แค่ใจดีกับตัวเองก็พอ', "Today doesn't need to be perfect. Being kind to yourself is enough."]],
    connection: [['คำถามง่าย ๆ ว่า "ช่วงนี้เป็นยังไงบ้าง" อาจมีความหมายกับใครบางคนมาก', 'A simple "how have you been?" can mean a lot to someone.'], ['ความสัมพันธ์ที่ดีคือการให้และรับอย่างพอดี', 'Good connections give and receive in balance.']],
    growth: [['เป็นมือใหม่ได้เสมอ การเริ่มต้นใหม่ไม่เคยสายเกินไป', "You can always be a beginner. It's never too late to begin again."], ['เหมือนพระจันทร์ เราเปลี่ยนแปลงได้โดยยังเป็นตัวเอง', 'Like the moon, you can change and still be yourself.']]
  };
  function reflectionFor(category, seed = Math.random()) {
    const list = reflections[category] || reflections.wellbeing;
    return list[Math.floor(Math.max(0, Math.min(0.9999, seed)) * list.length)];
  }

  // ---------- chat safety ----------
  // Messages are short and ephemeral. Links, phone numbers and contact IDs are
  // hidden to protect players from scams and unwanted contact.
  const blockedWords = ['fuck', 'shit', 'bitch', 'cunt', 'pussy', 'asshole', 'whore', 'slut', 'nigger', 'faggot', 'retard',
    'ควย', 'เหี้ย', 'สัส', 'เย็ด', 'แตด', 'ระยำ', 'ชาติหมา', 'อีดอก', 'อีเหี้ย', 'ไอ้สัตว์', 'อีสัตว์', 'ส้นตีน', 'กะหรี่', 'ดอกทอง'];
  const MAX_CHAT = 120;
  function cleanText(text, max = MAX_CHAT) {
    return String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }
  function filterChat(text) {
    let out = cleanText(text);
    let hidden = false;
    const hide = (pattern, label) => { out = out.replace(pattern, () => { hidden = true; return label; }); };
    hide(/\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|net|org|co|th|me|io|ly|gg|link|xyz|app)(?:\/\S*)?/gi, '[ลิงก์ถูกซ่อน]');
    hide(/(?:\+?\d[\s\-.]?){8,}/g, '[เบอร์ถูกซ่อน]');
    hide(/(?:line\s*(?:id)?|ไลน์|ig|instagram|ไอจี|@)\s*[:：]?\s*@?[a-z0-9._-]{3,}/gi, '[ไอดีถูกซ่อน]');
    for (const word of blockedWords) {
      const pattern = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(pattern, m => { hidden = true; return '♡'.repeat(Math.min(3, m.length)); });
    }
    return { text: out.slice(0, MAX_CHAT), hidden };
  }
  function validName(name) {
    const clean = cleanText(name, 16);
    if (clean.length < 2) return null;
    if (filterChat(clean).hidden) return null;
    return clean;
  }
  // Allow at most 3 messages in 10 seconds and one per 1.2 seconds.
  function rateCheck(times, now) {
    const recent = times.filter(t => now - t < 10000);
    if (recent.length >= 3) return { ok: false, wait: Math.ceil((10000 - (now - recent[0])) / 1000), times: recent };
    if (recent.length && now - recent[recent.length - 1] < 1200) return { ok: false, wait: 1, times: recent };
    return { ok: true, times: [...recent, now] };
  }
  const emotes = ['👋', '💛', '✨', '🙏', '😊', '🌙'];

  // ---------- network message validation ----------
  // Every incoming message is untrusted: clamp numbers and drop anything unexpected.
  function sanitizeState(m) {
    if (!m || typeof m !== 'object') return null;
    const id = cleanText(m.id, 64);
    if (!/^[a-zA-Z0-9-]{6,64}$/.test(id)) return null;
    const x = m.x, y = m.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const pos = clampToWorld({ x, y });
    const lead = parseCard(m.pet) ? m.pet : null;
    const followers = Array.isArray(m.followers) ? [...new Set(m.followers.filter(c => c !== lead && parseCard(c)))].slice(0, 2) : [];
    const dir = Number.isFinite(m.dir) ? Math.max(-Math.PI, Math.min(Math.PI, m.dir)) : 0;
    return { id, name: validName(m.name) || 'ผู้มาเยือน', x: pos.x, y: pos.y, dir, moving: m.moving === true, pet: lead, followers, glow: m.glow === true };
  }

  // Bind the payload to a sender authenticated by its private per-user topic.
  // Missing/failed roster lookups fail closed: a visitor becomes a star.
  function authorizeState(message, senderId, cardIds) {
    if (!message || message.id !== senderId) return null;
    const s = sanitizeState(message);
    if (!s) return null;
    const owned = new Set(Array.isArray(cardIds) ? cardIds.filter(c => parseCard(c)) : []);
    return { ...s, pet: owned.has(s.pet) ? s.pet : null, followers: s.followers.filter(c => owned.has(c)) };
  }

  return {
    WORLD, zones, pond, pavilion, trees, rocks, lanterns, flowerBeds, zoneAt, blocked, step, nearPavilion, clampToWorld,
    species, speciesNames, rankOrder, stardustValue, parseCard, petsFromQuantities, quantitiesFromHistory, duplicateStardust,
    rewards, offerings, dateKey, freshLedger, restoreLedger, balance, claimVisit, canPray, pray, carePet, makeOffering, reflections, reflectionFor,
    MAX_CHAT, cleanText, filterChat, validName, rateCheck, emotes, sanitizeState, authorizeState
  };
});
