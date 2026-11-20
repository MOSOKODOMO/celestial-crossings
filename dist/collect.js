(() => {
  'use strict';
  const E = window.CollectEngine, ui=window.MooJaiUI, copy=window.MooJaiCharmCopy;
  const say=(en,th)=>ui.language==='th'?th:en;
  const catName=c=>ui.language==='th'?copy.categories[c.id][0]:c.name;
  const catDescription=c=>ui.language==='th'?copy.categories[c.id][1]:c.description;
  const cardIndex=c=>E.ranks.findIndex(r=>r.id===c.rank);
  const cardTitle=c=>ui.language==='th'?copy.titles[c.category][cardIndex(c)]:c.title;
  const cardMeaning=c=>ui.language==='th'?copy.meanings[c.category][cardIndex(c)]:c.meaning;
  let viewedCard=null, viewedResult=null, goToCollection=false;
  const $ = selector => document.querySelector(selector);
  // Keep the original storage key so existing MooJai collections survive the rename.
  const key = 'celestial-atelier-preview-v1';
  let state = E.initialState();
  let storageAvailable = true;
  try { const stored = localStorage.getItem(key); if (stored) state = E.restore(stored); } catch { storageAvailable = false; }
  // Blank initial intentions belong to the UI; the tested engine rules stay intact.
  try {const raw=JSON.parse(localStorage.getItem(key)||'null');if(!raw||!E.validatePreferences(raw.preferences))state.preferences=[];}catch{state.preferences=[];}
  let galleryMode = location.hash==='#collection'?'owned':'explore';
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
    button.innerHTML = '<span class="pick-inner" aria-hidden="true"><span class="pick-back">'+ui.mark+'<small>MOOJAI</small></span><span class="pick-front"></span></span>';
    $('#card-picks').append(button);
    return button;
  });
  function icon(category) { return ui.icon(category.symbol); }
  function pill(rank) { return `<span class="rank-pill" data-rank="${rank}">${rank}</span>`; }
  function face(card, quantity = 0, loading = 'lazy') {
    const badge = quantity > 1 ? `<span class="quantity-tag">×${quantity}</span>` : '';
    return `<div class="oracle-face photo-card" data-rank="${card.rank}">
      <img src="assets/cards/${card.id}.webp" alt="" width="600" height="900"
        loading="${loading}" decoding="async"><span class="card-brand-overlay" aria-hidden="true">MOOJAI</span>${badge}
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
    $('#categories').innerHTML = E.categories.map(category => `<button type="button" class="category-button" data-category="${category.id}" aria-pressed="${state.preferences.includes(category.id)}" aria-describedby="selection-note" style="--category-color:${category.color}" ${locked ? 'disabled' : ''}><span class="category-icon">${icon(category)}</span><strong>${catName(category)}</strong><small>${catDescription(category)}</small><span class="selection-check" aria-hidden="true">✓</span></button>`).join('');
    $('#selection-count').textContent = say(`${state.preferences.length} OF 2 SELECTED`, `เลือกแล้ว ${state.preferences.length} จาก 2`);
    $('#selection-note').hidden = false;
    $('#selection-note').textContent = locked ? say('Intentions stay fixed until this set of ten is complete.','ความตั้งใจคงเดิมจนเปิดครบสิบครั้งในชุดนี้') : state.preferences.length < 2 ? say(`Choose ${2-state.preferences.length} more to begin.`,`เลือกอีก ${2-state.preferences.length} หมวดเพื่อเริ่ม`) : say('Two intentions selected. Tap a selected tile to change it.','เลือกครบแล้ว แตะหมวดที่เลือกไว้เพื่อเปลี่ยน');
    const ready = E.validatePreferences(state.preferences);
    picks.forEach(button => { button.disabled = !ready || drawing || accountLoading; });
    $('#draw-label').textContent = drawing ? say('Revealing your charm…','กำลังเปิดการ์ด…') : ready
      ? say('Choose one card to reveal your charm.','เลือกหนึ่งใบเพื่อเปิดการ์ดของคุณ')
      : say('Choose two intentions to unlock the cards.','เลือกสองความตั้งใจเพื่อเปิดการ์ด');
    $('#reset-button').disabled = drawing || isOnline();
    $('#rules-button').disabled = drawing;
    $('#categories').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.category;
      if (state.preferences.includes(id)) state.preferences = state.preferences.filter(item => item !== id);
      else if (state.preferences.length < 2) state.preferences = [...state.preferences, id];
      else { $('#selection-note').hidden = false; $('#selection-note').textContent = say('Two preferences selected. Deselect one to choose a different category.','เลือกครบสองหมวดแล้ว แตะหมวดเดิมออกก่อนเลือกหมวดใหม่'); announce(say('Deselect a category before choosing another.','แตะหมวดที่เลือกออกก่อนเลือกหมวดใหม่')); return; }
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
    if (count === 10) note.textContent = say('Promise fulfilled. You can choose new intentions.','ครบตามคำมั่นแล้ว เลือกความตั้งใจใหม่ได้');
    else if (matched) note.textContent = say('A charm for one of your intentions.','ได้รับการ์ดตรงกับหนึ่งความตั้งใจแล้ว');
    else if (count === 9) note.textContent = say('Your next card is guaranteed to match either intention.','ใบถัดไปจะตรงกับหนึ่งในสองความตั้งใจของคุณ');
    else note.textContent = '';
    $('#collection-count').textContent = state.total;
    $('#owned-count').textContent = state.total;
    $('#collection-storage').textContent=accountLoading?say('Loading account collection…','กำลังโหลดคลังบัญชี…'):isOnline()?say('Account collection','คลังในบัญชี'):storageAvailable?say('Saved in this browser','เก็บในเบราว์เซอร์นี้'):say('This session only','เฉพาะครั้งนี้');
    $('#storage-note').textContent=isOnline()?say('Account collection · Local preview charms stay separate.','คลังบัญชี · แยกจากการ์ดตัวอย่างในเครื่อง'):storageAvailable?say('Guest charms are saved in this browser. Signing in uses a separate collection. No automatic transfer.','การ์ดผู้เยี่ยมชมเก็บในเบราว์เซอร์นี้ เมื่อเข้าสู่บัญชีจะใช้คลังแยกกัน ไม่โอนให้อัตโนมัติ'):say('Browser storage is unavailable. Your charms last only until you reload or leave this page.','ใช้พื้นที่เก็บข้อมูลไม่ได้ การ์ดจะอยู่เฉพาะจนกว่าจะโหลดใหม่หรือออกจากหน้านี้');
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
      $('#collection-summary').textContent = say(`${quantities.size} unique charms · ${state.total} collected${!isOnline()&&state.total>1000?' · showing latest 1,000 reveals':''}`,`${quantities.size} แบบ · สะสม ${state.total} ใบ${!isOnline()&&state.total>1000?' · แสดงล่าสุด 1,000 ครั้ง':''}`);
    } else {
      shown = E.cards.filter(card => filter === 'all' || card.category === filter);
      $('#collection-summary').textContent = say(`${shown.length} charms · Preview only`, `${shown.length} ใบ · ตัวอย่างการ์ด`);
    }
    $('#empty-collection').hidden = shown.length > 0;
    $('#empty-collection h3').textContent = state.total && owned ? say('No charms in this category.','ยังไม่มีการ์ดในหมวดนี้') : say('Your first charm is waiting.','การ์ดใบแรกกำลังรอคุณ');
    $('#empty-collection p').textContent = state.total && owned ? say('Try another category or clear your filter.','เลือกหมวดอื่นหรือล้างตัวกรอง') : say('Reveal a charm to begin your collection.','เปิดการ์ดเพื่อเริ่มสะสม');
    $('#empty-action').textContent=state.total&&owned?say('Clear filter','ล้างตัวกรอง'):say('Reveal my first charm','เปิดการ์ดใบแรก');
    $('#empty-action').onclick=e=>{if(state.total&&owned){e.preventDefault();$('#collection-filter').value='all';renderGallery();}};
    $('#card-gallery').innerHTML = shown.map(card => {
      const category = E.categories.find(item => item.id === card.category);
      return `<button type="button" class="gallery-card" data-card="${card.id}" aria-label="View ${card.title}, ${category.name}, ${card.rank}${owned?`, ${quantities.get(card.id)} collected`:''}">${face(card, owned ? quantities.get(card.id) : 0)}<h3>${cardTitle(card)}</h3><div class="gallery-meta"><span>${icon(category)}${catName(category)}</span>${pill(card.rank)}</div></button>`;
    }).join('');
    $('#card-gallery').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      if (!drawing) showCard(E.cards.find(card => card.id === button.dataset.card), null);
    }));
  }
  function showCard(card, result) {
    viewedCard=card;viewedResult=result;
    const category = E.categories.find(item => item.id === card.category);
    $('#revealed-card').innerHTML = face(card, 0, 'eager');
    $('#reveal-category').innerHTML = `${icon(category)} ${catName(category)} ${pill(card.rank)}`;
    $('#reveal-title').textContent = cardTitle(card);
    // Drawn or owned charms can be visited as a pet; preview-only cards cannot.
    const worldLink = $('#reveal-world-link');
    if (worldLink) { worldLink.hidden = !(result || galleryMode === 'owned'); worldLink.href = 'world.html?lead=' + encodeURIComponent(card.id); }
    $('#reveal-meaning').textContent = cardMeaning(card);
    const quantity=isOnline()&&onlineQuantities?onlineQuantities[card.id]||0:state.history.filter(c=>c.cardId===card.id).length;
    $('#reveal-eyebrow').textContent = result ? quantity>1?say('ANOTHER COPY · ×'+quantity,'การ์ดซ้ำ · ×'+quantity):say('A NEW PIECE OF YOUR STORY','เรื่องราวใหม่ของคุณ') : say('A CLOSER LOOK','มองการ์ดใกล้ ๆ');
    $('#keep-card').querySelector('span[data-en]').textContent=result||galleryMode==='owned'?say('View my charms','ดูการ์ดของฉัน'):say('Back to collection','กลับคลังการ์ด');
    $('#preferred-result').textContent = result ? result.guaranteed ? say('Your 10-draw promise · preferred category','คำมั่นในสิบครั้ง · ตรงกับความตั้งใจ') : result.preferred ? say('One of your preferred categories','ตรงกับหนึ่งในความตั้งใจของคุณ') : say('A little discovery beyond your preferences','ความหมายใหม่ นอกเหนือจากความตั้งใจที่เลือก') : say('Collection preview · '+card.rank,'ตัวอย่างการ์ด · '+card.rank);
    $('#saved-note').textContent = result ? say('Added to your collection','เพิ่มเข้าคลังแล้ว')+' · '+(isOnline()?say('Account collection','คลังบัญชี'):storageAvailable?say('This browser','เบราว์เซอร์นี้'):say('This session only','เฉพาะครั้งนี้')) : galleryMode === 'owned' ? say('From your collection','จากคลังของคุณ') : say('Collection preview · Not added to your collection','ตัวอย่างการ์ด · ยังไม่ได้เพิ่มเข้าคลัง');
    window.CharmReveal.open({
      cinematic: Boolean(result),
      onReveal: result ? () => announce(say(`You drew ${card.title}, ${card.rank}, ${category.name}.`,`คุณได้ ${cardTitle(card)} ${card.rank} หมวด${catName(category)}`)) : null
    });
  }
  for (const [slot, id] of Object.entries({left:'love-SSR', main:'growth-SSR', right:'wealth-SSR'})) {
    if($(`#hero-${slot}`))$(`#hero-${slot}`).innerHTML = face(E.cards.find(card => card.id === id), 0, 'eager');
  }
  $('#odds-table').innerHTML = E.ranks.map(rank => `<div>${pill(rank.id)}<span>${rank.chance}%</span><small>${rank.name}</small></div>`).join('');
  $('#collection-filter').innerHTML = '<option value="all">'+say('All categories','ทุกหมวด')+'</option>';
  $('#collection-filter').innerHTML += E.categories.map(category => `<option value="${category.id}">${catName(category)}</option>`).join('');
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
    if(goToCollection){$('#edition-title').focus({preventScroll:true});goToCollection=false;}else pickedCard.focus({preventScroll:true});
    pickedCard = null;
  });
  $('#close-reveal').addEventListener('click', () => $('#reveal-dialog').close());
  $('#keep-card').addEventListener('click', () => {goToCollection=Boolean(viewedResult)||galleryMode==='owned';$('#reveal-dialog').close();if(goToCollection){location.hash='collection';setGallery('owned',true);}else setGallery('explore',true);});
  $('#rules-button').addEventListener('click', () => $('#info-dialog').showModal());
  $('#draw-rules-link').onclick=()=>$('#info-dialog').showModal();
  ['close-info','guide-done'].forEach(id => $(`#${id}`).addEventListener('click', () => $('#info-dialog').close()));
  function setGallery(mode, scroll) {
    if (galleryMode !== mode) $('#collection-filter').value = 'all';
    galleryMode = mode;
    renderGallery();
    if(scroll){$('#ritual').hidden=true;$('.edition-section').hidden=false;$('.edition-section').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  }
  $('#browse-button').addEventListener('click', () => {location.hash='deck';setGallery('explore',false);});
  $('#owned-button').addEventListener('click', () => {location.hash='collection';setGallery('owned',false);});
  $('#collection-nav').addEventListener('click', () => {location.hash='collection';setGallery('owned',true);});
  $('#collection-filter').addEventListener('change', renderGallery);
  $('#header-draw').addEventListener('click', () => {location.hash='ritual';showRoute();});
  $('#reset-button').addEventListener('click', () => $('#reset-dialog').showModal());
  $('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
  $('#confirm-reset').addEventListener('click', () => {
    if (isOnline()) return;
    state = E.initialState();state.preferences=[];
    persist();
    $('#collection-filter').value = 'all';
    $('#reset-dialog').close();
    render();
    announce(say('Collection reset. Your cards and draw progress are empty.','ล้างคลังแล้ว การ์ดและความคืบหน้าว่างแล้ว'));
  });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }));
  function showRoute(){
    const collection=['#collection','#deck'].includes(location.hash);
    $('#ritual').hidden=collection;$('.edition-section').hidden=!collection;
    if(collection)setGallery(location.hash==='#collection'?'owned':'explore',false);
    $('#header-draw').setAttribute('aria-pressed',String(!collection));
    $('#collection-nav').setAttribute('aria-pressed',String(collection&&galleryMode==='owned'));
  }
  window.addEventListener('hashchange',()=>{showRoute();const target=location.hash==='#ritual'?$('#ritual'):$('.edition-section');target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  document.addEventListener('moojai:language',()=>{render();if(viewedCard&&$('#reveal-dialog').open){$('#reveal-title').textContent=cardTitle(viewedCard);$('#reveal-meaning').textContent=cardMeaning(viewedCard);}const chosen=$('#collection-filter').value;$('#collection-filter').innerHTML='<option value="all">'+say('All categories','ทุกหมวด')+'</option>'+E.categories.map(c=>'<option value="'+c.id+'">'+catName(c)+'</option>').join('');$('#collection-filter').value=chosen;});
  render();showRoute();
  async function syncAccount() {
    const nextId = window.MooJaiAccount?.user?.id || null;
    if (nextId === accountId) return;
    accountId = nextId; pendingRequest = null; onlineQuantities = null;
    if (drawing) { drawing = false; pickedCard = null; $('#reveal-dialog').close(); }
    accountLoading = Boolean(nextId);$('#collection-load-error').hidden=true;$('#retry-collection').hidden=true;
    // Clear the displayed preview before starting an online load.
    try { const raw=localStorage.getItem(key);state = nextId ? E.initialState() : E.restore(raw);if(nextId||!E.validatePreferences(JSON.parse(raw||'null')?.preferences))state.preferences=[]; } catch { state = E.initialState();state.preferences=[]; }
    render();
    if (!nextId) return;
    try {
      const [states, cards] = await Promise.all([
        accountRequest('/rest/v1/draw_state?select=state'),
        accountRequest('/rest/v1/charm_collection?select=card_id,quantity')
      ]);
      if (accountId !== nextId) return;
      state = states[0] ? E.restore(JSON.stringify(states[0].state)) : E.initialState();
      if(!states[0])state.preferences=[];
      onlineQuantities = Object.fromEntries(cards.map(c => [c.card_id, c.quantity]));
      accountLoading = false; render();
    } catch (error) {
      if (accountId !== nextId) return;
      // Fail closed; a configured account never silently falls back to local draws.
      $('#draw-label').textContent = error.message;$('#collection-load-error').hidden=false;$('#collection-load-error').textContent=say('Your account collection could not be loaded. Your saved charms have not been removed.','โหลดคลังบัญชีไม่ได้ การ์ดที่บันทึกไว้ยังไม่ถูกลบ');$('#retry-collection').hidden=false;$('#card-gallery').innerHTML='';$('#empty-collection').hidden=true;announce(error.message);
    }
  }
  $('#retry-collection').onclick=()=>{accountId=null;syncAccount();};
  document.addEventListener('moojai:auth', syncAccount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncAccount, { once: true }); else syncAccount();
})();
