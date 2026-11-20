(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CollectEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const categories = [
    { id: 'love', name: 'Love', description: 'Romance & relationships', color: '#d995a7', symbol: 'heart' },
    { id: 'career', name: 'Career', description: 'Ambition & purpose', color: '#8faed5', symbol: 'sun' },
    { id: 'wealth', name: 'Wealth', description: 'Money & security', color: '#d8ba76', symbol: 'coin' },
    { id: 'wellbeing', name: 'Wellbeing', description: 'Rest & inner balance', color: '#8ebca9', symbol: 'leaf' },
    { id: 'connection', name: 'Connection', description: 'Friends & family', color: '#b8a3d6', symbol: 'stars' },
    { id: 'growth', name: 'Growth', description: 'Change & self-discovery', color: '#d1aa83', symbol: 'moon' }
  ];
  const ranks = [
    { id: 'SSR', name: 'Celestial', chance: 0.15 },
    { id: 'SR', name: 'Mythic', chance: 2.85 },
    { id: 'S', name: 'Radiant', chance: 12 },
    { id: 'R', name: 'Rare', chance: 30 },
    { id: 'C', name: 'Common', chance: 55 }
  ];
  const names = {
    love: ['The Eternal Bond', 'The Thread of Trust', 'The Open Heart', 'The Gentle Bloom', 'The First Spark'],
    career: ['The Sovereign Sun', 'The North Star', 'The Crossroads', 'The Compass', 'The First Step'],
    wealth: ['The Golden World', 'The Cornucopia', 'The Harvest', 'The Golden Key', 'The Seed'],
    wellbeing: ['The Sacred Lotus', 'The Still Water', 'The Sanctuary', 'The Quiet Moon', 'The Breath'],
    connection: ['The Constellation', 'The Kindred Circle', 'The Hearth', 'The Bridge', 'The Helping Hand'],
    growth: ['Phra Chan', 'The Phoenix', 'The Becoming', 'The Open Door', 'The New Leaf']
  };
  const meanings = {
    love: ['A lasting connection grows through care, honesty, and the freedom to be yourself.', 'Trust grows when you make space for each other to speak honestly.', 'Make a little room for vulnerability. Let someone know what matters to you.', 'Care grows through small gestures. Give your attention to a relationship you value.', 'Every connection begins somewhere. Let curiosity lead a small, kind conversation.'],
    career: ['Define success in your own terms, then lead with that clarity.', 'A clear intention can guide your next move even when the whole path is unknown.', 'Pause at the crossroads. Choose the direction that fits your values.', 'Your next useful step may be smaller than your ambition. Take it anyway.', 'Give one unfinished idea twenty minutes of focused attention.'],
    wealth: ['Enough is a vision worth defining. Consider what a secure, generous life means to you.', 'Notice the resources already around you: time, knowledge, and the people you trust.', 'Recognize what patient effort has made possible. Decide what deserves continued care.', 'Look for a practical habit that makes your resources easier to understand.', 'Small, steady actions create a foundation. Begin with what is within reach.'],
    wellbeing: ['Balance is a practice of returning to yourself. Make room for what restores you.', 'Let a quiet moment reveal what a busy day can hide.', 'Create one small space where you can pause without needing to achieve anything.', 'Rest does not have to be earned. Make a little space for it today.', 'Pause, breathe comfortably, and notice what you need in this moment.'],
    connection: ['You belong to more than one story. Celebrate the people who help you feel at home.', 'Notice where support flows both ways. Make time for those connections.', 'A sense of home can begin with a simple invitation or shared ritual.', 'Reach across a small distance. Ask someone how they have really been.', 'One thoughtful gesture can make an ordinary day feel less lonely.'],
    growth: ['Like the moon, you can change and remain yourself. Honour the season you are in.', 'Something you have outgrown can become the beginning of something new.', 'You do not need a finished version of yourself to take the next step.', 'An unfamiliar possibility deserves a moment of honest curiosity.', 'Give yourself permission to be a beginner at something that matters.']
  };
  const cards = categories.flatMap(category => ranks.map((rank, i) => ({
    id: `${category.id}-${rank.id}`, category: category.id, rank: rank.id,
    title: names[category.id][i], meaning: meanings[category.id][i],
    number: String(categories.indexOf(category) * 5 + i + 1).padStart(2, '0')
  })));
  function initialState() { return { version: 1, preferences: ['love', 'career'], cycle: [], history: [], total: 0 }; }
  function validatePreferences(preferences) {
    return Array.isArray(preferences) && preferences.length === 2 && new Set(preferences).size === 2 && preferences.every(id => categories.some(c => c.id === id));
  }
  function randomUnit() {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 4294967296;
  }
  function unit(rng) {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random value must be in [0, 1).');
    return value;
  }
  function rollRank(value) {
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Invalid rarity roll.');
    let boundary = 0;
    for (const rank of ranks) {
      boundary += Math.round(rank.chance * 100);
      if (value * 10000 < boundary) return rank.id;
    }
    return 'C';
  }
  function draw(state, rng = randomUnit) {
    if (!validatePreferences(state.preferences)) throw new Error('Choose exactly two categories.');
    const cycle = state.cycle.length === 10 ? [] : state.cycle;
    const matched = cycle.some(item => state.preferences.includes(item.category));
    const guaranteed = cycle.length === 9 && !matched;
    const pool = guaranteed ? state.preferences : categories.map(c => c.id);
    const category = pool[Math.floor(unit(rng) * pool.length)];
    const rank = rollRank(unit(rng));
    const card = cards.find(item => item.category === category && item.rank === rank);
    const result = { cardId: card.id, category, rank, preferred: state.preferences.includes(category), guaranteed, serial: state.total + 1 };
    return {
      state: { ...state, cycle: [...cycle, result], history: [...state.history, result].slice(-1000), total: state.total + 1 },
      result, card
    };
  }
  function restore(raw) {
    try {
      const state = JSON.parse(raw);
      if (!state || state.version !== 1 || !validatePreferences(state.preferences) || !Array.isArray(state.cycle) || state.cycle.length > 10 || !Array.isArray(state.history) || state.history.length > 1000 || !Number.isSafeInteger(state.total) || state.total < 0) return initialState();
      const validItem = item => item && cards.some(card => card.id === item.cardId && card.rank === item.rank && card.category === item.category) && typeof item.preferred === 'boolean' && typeof item.guaranteed === 'boolean' && Number.isSafeInteger(item.serial) && item.serial > 0 && item.serial <= state.total;
      if (!state.cycle.every(validItem) || !state.history.every(validItem) || state.history.length !== Math.min(state.total, 1000) || state.cycle.length !== (state.total === 0 ? 0 : ((state.total - 1) % 10) + 1)) return initialState();
      if (JSON.stringify(state.cycle) !== JSON.stringify(state.history.slice(-state.cycle.length || state.history.length))) return initialState();
      if (state.cycle.length === 10 && !state.cycle.some(item => item.preferred)) return initialState();
      return state;
    } catch { return initialState(); }
  }
  return { categories, ranks, cards, initialState, validatePreferences, rollRank, draw, restore };
});
