// Gentle companion needs. These local meters never change ownership or rewards.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorldCare = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const foods = Object.freeze({ berries: { hunger: 20, energy: 5 }, meal: { hunger: 45, energy: 12 } });
  const clamp = (n, fallback) => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
  function normalize(raw) {
    return { hunger: clamp(raw?.hunger, 25), energy: clamp(raw?.energy, 85), feedReadyAt: Number.isSafeInteger(raw?.feedReadyAt) && raw.feedReadyAt >= 0 ? raw.feedReadyAt : 0 };
  }
  function restore(raw) {
    const pets = {};
    if (raw?.version === 1 && raw.pets && typeof raw.pets === 'object') {
      for (const [id, value] of Object.entries(raw.pets)) {
        if (/^(love|career|wealth|wellbeing|connection|growth)-(C|R|S|SR|SSR)$/.test(id)) pets[id] = normalize(value);
      }
    }
    return { version: 1, pets };
  }
  function advance(raw, seconds, { moving = false, resting = false } = {}) {
    const needs = normalize(raw);
    // The caller supplies visible play time; tab suspension never catches up.
    const dt = Number.isFinite(seconds) ? Math.max(0, Math.min(5, seconds)) : 0;
    return { ...needs,
      hunger: clamp(needs.hunger + dt * (moving ? 2 : 1) / 60, 25),
      energy: clamp(needs.energy + dt * (resting && !moving ? 2 : moving ? -3 / 60 : 0), 85)
    };
  }
  function feed(raw, kind, now = Date.now()) {
    const needs = normalize(raw), food = Object.hasOwn(foods, kind) ? foods[kind] : null;
    if (!food || !Number.isSafeInteger(now) || now < 0) return { ok: false, reason: 'invalid', needs };
    if (needs.feedReadyAt > now) return { ok: false, reason: 'chewing', needs };
    if (needs.hunger < 1) return { ok: false, reason: 'full', needs };
    return { ok: true, needs: { hunger: Math.max(0, needs.hunger - food.hunger), energy: Math.min(100, needs.energy + food.energy), feedReadyAt: now + 4000 } };
  }
  return Object.freeze({ foods, normalize, restore, advance, feed });
});
