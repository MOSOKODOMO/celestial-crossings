(() => {
  'use strict';
  const E = window.CollectEngine;
  const $ = selector => document.querySelector(selector);
  // Keep the original storage key so existing MooJai collections survive the rename.
  const key = 'celestial-atelier-preview-v1';
  let state = E.initialState();
  let storageAvailable = true;
  try { const stored = localStorage.getItem(key); if (stored) state = E.restore(stored); } catch { storageAvailable = false; }
  let galleryMode = 'explore';
  let drawing = false;
  let accountLoading = false, onlineQuantities = null, accountId = null, pendingRequest = null;
  const isOnline = () => Boolean(window.MooJaiAccount?.enabled && window.MooJaiAccount?.user);
  async function accountRequest(path, body) {
    const config = window.MOOJAI_CONFIG, token = await window.MooJaiAccount.getAccessToken();
    if (!token) throw new Error('Please sign in again.');
    const response = await fetch(config.supabaseUrl.replace(/\/$/, '') + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: config.supabaseAnonKey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000)
    }).catch(() => { throw new Error('Could not reach your collection. Please try again.'); });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error === 'daily_limit' ? 'Your free charms for today are complete. Come back tomorrow.' : data.error === 'preferences_locked' ? 'Your intentions are fixed for this set of ten. Refresh to see your current progress.' : 'Could not reach your collection. Please try again.');
    return data;
  }
  let pickedCard = null;
  const picks = ['Left', 'Middle', 'Right'].map(position => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card-pick';
    button.setAttribute('aria-label', `${position} card`);
    button.innerHTML = '<span class="pick-inner" aria-hidden="true"><span class="pick-back"><span>☾</span></span><span class="pick-front"></span></span>';
    $('#card-picks').append(button);
    return button;
  });
  const icons = {
    heart: '<path d="M12 21S2 15 2 8.5C2 3 8 1 12 6c4-5 10-3 10 2.5C22 15 12 21 12 21Z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    coin: '<circle cx="12" cy="12" r="10"/><path d="m12 5 6 7-6 7-6-7 6-7Zm0 0v14M6 12h12"/>',
    leaf: '<path d="M12 22V12m0 4C3 16 1 9 2 3c7 0 11 5 10 13Zm0-3C12 5 17 2 23 2c0 7-4 12-11 11Z"/>',
    stars: '<path d="m8 2 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Zm10 11 1.4 3.6L23 18l-3.6 1.4L18 23l-1.4-3.6L13 18l3.6-1.4L18 13Z"/>',
    moon: '<path d="M19.5 16.5A9.5 9.5 0 0 1 7.5 3 9.5 9.5 0 1 0 21 15c-.5.6-1 1.1-1.5 1.5Z"/><path d="m18 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/>'
  };
  function icon(category) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[category.symbol]}</svg>`; }
  function pill(rank) { return `<span class="rank-pill" data-rank="${rank}">${rank}</span>`; }
  function face(card, quantity = 0, loading = 'lazy') {
    const badge = quantity > 1 ? `<span class="quantity-tag">×${quantity}</span>` : '';
    return `<div class="oracle-face photo-card" data-rank="${card.rank}">
      <img src="assets/cards/${card.id}.webp" alt="" width="600" height="900"
        loading="${loading}" decoding="async">${badge}
    </div>`;
  }
  function persist() {
    if (isOnline()) return; // Never mix server inventory or state into the local preview save.
    try { localStorage.setItem(key, JSON.stringify(state)); storageAvailable = true; }
    catch { storageAvailable = false; }
    if (!storageAvailable) $('#storage-note').textContent = 'Concept preview · No payments · Browser storage unavailable; this collection lasts until you reload · For reflection and entertainment';
  }
  function announce(message) { $('#announcement').textContent = message; }
  function renderPreferences() {
    const locked = drawing || accountLoading || (state.cycle.length > 0 && state.cycle.length < 10);
    $('#categories').innerHTML = E.categories.map(category => `<button type="button" class="category-button" data-category="${category.id}" aria-pressed="${state.preferences.includes(category.id)}" aria-describedby="selection-note" style="--category-color:${category.color}" ${locked ? 'disabled' : ''}><span class="category-icon">${icon(category)}</span><strong>${category.name}</strong><small>${category.description}</small><span class="selection-check" aria-hidden="true">✓</span></button>`).join('');
    $('#selection-count').textContent = `${state.preferences.length} OF 2 SELECTED`;
    $('#selection-note').hidden = locked || state.preferences.length === 2;
    $('#selection-note').textContent = state.preferences.length < 2 ? `Choose ${2-state.preferences.length} more ${state.preferences.length === 0 ? 'categories' : 'category'} to begin.` : '';
    const ready = E.validatePreferences(state.preferences);
    picks.forEach(button => { button.disabled = !ready || drawing || accountLoading; });
    $('#draw-label').textContent = drawing ? 'Revealing your charm…' : ready
      ? 'Choose one card to reveal your charm.'
      : 'Choose two intentions to unlock the cards.';
    $('#reset-button').disabled = drawing || isOnline();
    $('#rules-button').disabled = drawing;
    $('#categories').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.category;
      if (state.preferences.includes(id)) state.preferences = state.preferences.filter(item => item !== id);
      else if (state.preferences.length < 2) state.preferences = [...state.preferences, id];
      else { $('#selection-note').hidden = false; $('#selection-note').textContent = 'Two preferences selected. Deselect one to choose a different category.'; announce('Deselect a category before choosing another.'); return; }
      renderPreferences();
      if (E.validatePreferences(state.preferences)) persist();
      const replacement = $(`[data-category="${id}"]`); if (replacement) replacement.focus({preventScroll:true});
    }));
  }
  function renderProgress() {
    const count = state.cycle.length;
    const matched = state.cycle.some(item => item.preferred);
    $('#draw-progress').textContent = `${count} / 10`;
    $('#progress-track').setAttribute('aria-valuenow', count);
    $('#progress-track').innerHTML = Array.from({length:10},(_,i) => {
      const item = state.cycle[i];
      return `<span class="progress-pip ${item ? (item.preferred ? 'matched' : 'filled') : count===9 && !matched && i===9 ? 'next-guarantee' : ''}" title="Draw ${i+1}${item ? item.preferred ? ': preferred category' : ': another category' : ': waiting'}"></span>`;
    }).join('');
    const note = $('#guarantee-note');
    note.classList.toggle('fulfilled', matched);
    note.hidden = count !== 10 && !matched && count !== 9;
    if (count === 10) note.innerHTML = '<strong>Promise fulfilled.</strong> A new set of intentions awaits.';
    else if (matched) note.innerHTML = '<strong>A charm for one of your intentions.</strong>';
    else if (count === 9) note.innerHTML = '<strong>Your next card is guaranteed</strong> to match either intention.';
    else note.textContent = '';
    $('#collection-count').textContent = state.total;
    $('#owned-count').textContent = state.total;
  }
  function renderGallery() {
    const owned = galleryMode === 'owned';
    $('#browse-button').classList.toggle('active', !owned);
    $('#owned-button').classList.toggle('active', owned);
    $('#browse-button').setAttribute('aria-pressed', !owned);
    $('#owned-button').setAttribute('aria-pressed', owned);
    const filter = $('#collection-filter').value;
    let shown;
    const quantities = new Map();
    if (isOnline() && onlineQuantities) Object.entries(onlineQuantities).forEach(([id,q]) => quantities.set(id,q));
    else state.history.forEach(item => quantities.set(item.cardId, (quantities.get(item.cardId) || 0) + 1));
    if (owned) {
      shown = [...quantities.keys()].reverse().map(id => E.cards.find(card => card.id === id)).filter(card => filter === 'all' || card.category === filter);
      $('#collection-summary').textContent = `${state.total} ${state.total===1?'charm':'charms'} · ${quantities.size} unique${!isOnline()&&state.total>1000?' · showing latest 1,000 reveals':''}`;
    } else {
      shown = E.cards.filter(card => filter === 'all' || card.category === filter);
      $('#collection-summary').textContent = `${shown.length} charms`;
    }
    $('#empty-collection').hidden = shown.length > 0;
    $('#empty-collection h3').textContent = state.total && owned ? 'A little more to discover.' : 'Your first charm is waiting.';
    $('#empty-collection p').textContent = state.total && owned ? 'No charms in this category yet.' : 'Reveal a charm to begin your collection.';
    $('#card-gallery').innerHTML = shown.map(card => {
      const category = E.categories.find(item => item.id === card.category);
      return `<button type="button" class="gallery-card" data-card="${card.id}" aria-label="View ${card.title}, ${category.name}, ${card.rank}${owned?`, ${quantities.get(card.id)} collected`:''}">${face(card, owned ? quantities.get(card.id) : 0)}<h3>${card.title}</h3><div class="gallery-meta"><span><i class="category-dot" style="--category-color:${category.color}"></i>${category.name}</span>${pill(card.rank)}</div></button>`;
    }).join('');
    $('#card-gallery').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      if (!drawing) showCard(E.cards.find(card => card.id === button.dataset.card), null);
    }));
  }
  function showCard(card, result) {
    const category = E.categories.find(item => item.id === card.category);
    $('#revealed-card').innerHTML = face(card, 0, 'eager');
    $('#reveal-category').innerHTML = `${category.name} ${pill(card.rank)}`;
    $('#reveal-title').textContent = card.title;
    // Drawn or owned charms can be visited as a pet; preview-only cards cannot.
    const worldLink = $('#reveal-world-link');
    if (worldLink) { worldLink.hidden = !(result || galleryMode === 'owned'); worldLink.href = 'world.html?lead=' + encodeURIComponent(card.id); }
    $('#reveal-meaning').textContent = card.meaning;
    $('#reveal-eyebrow').textContent = result ? 'A MESSAGE FOR YOUR JOURNEY' : 'A CLOSER LOOK';
    $('#preferred-result').textContent = result ? result.guaranteed ? '✧ Your 10-draw promise · preferred category' : result.preferred ? '✧ One of your preferred categories' : 'A little discovery beyond your preferences' : E.ranks.find(rank => rank.id===card.rank).name + ' · First edition';
    $('#saved-note').textContent = result ? storageAvailable ? `Card #${result.serial} · Added to your collection` : `Card #${result.serial} · Kept for this session only` : galleryMode === 'owned' ? 'From your collection' : 'Collection preview · Not added to your collection';
    window.CharmReveal.open({
      cinematic: Boolean(result),
      onReveal: result ? () => announce(`You drew ${card.title}, ${card.rank}, ${category.name}.`) : null
    });
  }
  for (const [slot, id] of Object.entries({left:'love-SSR', main:'growth-SSR', right:'wealth-SSR'})) {
    $(`#hero-${slot}`).innerHTML = face(E.cards.find(card => card.id === id), 0, 'eager');
  }
  $('#odds-table').innerHTML = E.ranks.map(rank => `<div>${pill(rank.id)}<span>${rank.chance}%</span><small>${rank.name}</small></div>`).join('');
  $('#collection-filter').innerHTML += E.categories.map(category => `<option value="${category.id}">${category.name}</option>`).join('');
  function render() { renderPreferences(); renderProgress(); renderGallery(); }
  async function pickCharm(button) {
    if (drawing || accountLoading || !E.validatePreferences(state.preferences)) return;
    drawing = true;
    pickedCard = button;
    renderPreferences();
    const startedAs = window.MooJaiAccount?.user?.id || null;
    try {
      let outcome;
      if (isOnline()) {
        // Keep the request ID across retries/reloads so a lost response never grants two cards.
        const pendingKey = 'moojai-pending-draw-' + startedAs;
        if (!pendingRequest) {
          try { pendingRequest = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); } catch {}
          if (pendingRequest && (!/^[0-9a-f-]{36}$/i.test(pendingRequest.requestId || '') || !E.validatePreferences(pendingRequest.preferences))) pendingRequest = null;
          pendingRequest ||= { requestId: crypto.randomUUID(), preferences: [...state.preferences] };
          try { sessionStorage.setItem(pendingKey, JSON.stringify(pendingRequest)); } catch {}
        }
        outcome = await accountRequest('/functions/v1/draw', pendingRequest);
        outcome.card = E.cards.find(card => card.id === outcome.result?.cardId);
        if (!outcome.card || !outcome.state) throw new Error('Could not read the saved charm. Please try again.');
        if (window.MooJaiAccount?.user?.id !== startedAs) return;
        // Inventory may extend beyond the 1,000 retained history records.
        const inventory = await accountRequest('/rest/v1/charm_collection?select=card_id,quantity').catch(() => null);
        if (window.MooJaiAccount?.user?.id !== startedAs) return;
        if (inventory) onlineQuantities = Object.fromEntries(inventory.map(c => [c.card_id, c.quantity]));
        else if (onlineQuantities) onlineQuantities[outcome.card.id] = Math.max((onlineQuantities[outcome.card.id] || 0) + (outcome.replayed ? 0 : 1), outcome.state.history.filter(c => c.cardId === outcome.card.id).length);
        pendingRequest = null;
        try { sessionStorage.removeItem(pendingKey); } catch {}
        // A hint for other tabs to re-fetch verified inventory; never an ownership grant.
        try { localStorage.setItem('moojai-collection-update-v1', JSON.stringify({ userId: startedAs, at: Date.now() })); } catch {}
      } else outcome = E.draw(state);
      // The server/local result is committed before the reveal starts.
      state = outcome.state;
      persist();
      render();
      showCard(outcome.card, outcome.result);
    } catch (error) {
      drawing = false; pickedCard = null; renderPreferences();
      announce(error.message); $('#draw-label').textContent = error.message;
    }
  }
  picks.forEach(button => button.addEventListener('click', () => pickCharm(button)));
  $('#reveal-dialog').addEventListener('close', () => {
    if (!pickedCard) return;
    drawing = false;
    renderPreferences();
    pickedCard.focus({preventScroll:true});
    pickedCard = null;
  });
  $('#close-reveal').addEventListener('click', () => $('#reveal-dialog').close());
  $('#keep-card').addEventListener('click', () => $('#reveal-dialog').close());
  $('#rules-button').addEventListener('click', () => $('#info-dialog').showModal());
  ['close-info','guide-done'].forEach(id => $(`#${id}`).addEventListener('click', () => $('#info-dialog').close()));
  function setGallery(mode, scroll) {
    if (galleryMode !== mode) $('#collection-filter').value = 'all';
    galleryMode = mode;
    renderGallery();
    if (scroll) $('.edition-section').scrollIntoView({behavior:'smooth'});
  }
  $('#browse-button').addEventListener('click', () => setGallery('explore', false));
  $('#owned-button').addEventListener('click', () => setGallery('owned', false));
  $('#collection-nav').addEventListener('click', () => setGallery('owned', true));
  $('#collection-filter').addEventListener('change', renderGallery);
  $('#header-draw').addEventListener('click', () => $('#ritual').scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  }));
  $('#reset-button').addEventListener('click', () => $('#reset-dialog').showModal());
  $('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
  $('#confirm-reset').addEventListener('click', () => {
    if (isOnline()) return;
    state = E.initialState();
    persist();
    $('#collection-filter').value = 'all';
    $('#reset-dialog').close();
    render();
    announce('Preview reset. Your collection and draw progress are empty.');
  });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }));
  render();
  async function syncAccount() {
    const nextId = window.MooJaiAccount?.user?.id || null;
    if (nextId === accountId) return;
    accountId = nextId; pendingRequest = null; onlineQuantities = null;
    if (drawing) { drawing = false; pickedCard = null; $('#reveal-dialog').close(); }
    accountLoading = Boolean(nextId);
    // Clear the displayed preview before starting an online load.
    try { state = nextId ? E.initialState() : E.restore(localStorage.getItem(key)); } catch { state = E.initialState(); }
    render();
    if (!nextId) { $('#storage-note').textContent = 'Concept preview · No payments · For reflection and entertainment'; return; }
    $('#storage-note').textContent = 'Your account collection · Free daily charms · Saved securely online';
    try {
      const [states, cards] = await Promise.all([
        accountRequest('/rest/v1/draw_state?select=state'),
        accountRequest('/rest/v1/charm_collection?select=card_id,quantity')
      ]);
      if (accountId !== nextId) return;
      state = states[0] ? E.restore(JSON.stringify(states[0].state)) : E.initialState();
      onlineQuantities = Object.fromEntries(cards.map(c => [c.card_id, c.quantity]));
      accountLoading = false; render();
    } catch (error) {
      if (accountId !== nextId) return;
      // Fail closed; a configured account never silently falls back to local draws.
      $('#draw-label').textContent = error.message + ' Refresh to retry.'; announce(error.message);
    }
  }
  document.addEventListener('moojai:auth', syncAccount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncAccount, { once: true }); else syncAccount();
  if (!storageAvailable) $('#storage-note').textContent = 'Concept preview · No payments · Collection lasts for this session; browser storage unavailable · For reflection and entertainment';
})();
