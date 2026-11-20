import { copy } from './world-i18n.js';
import { previewTransport, onlineTransport } from './world-transport.js';
import { collection, request } from './world-api.js';

const W = window.WorldCore, C = window.WorldCare, $ = s => document.querySelector(s);
const SAVE = 'moojai-world-v1', LEDGER = 'moojai-world-ledger-v1', COLLECTOR = 'celestial-atelier-preview-v1', LOTUSES = 'moojai-world-lotuses-v1';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let storageOK = true;
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageOK = false; } }
const prefs = read(SAVE, {}), reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lang = prefs.language === 'en' ? 'en' : 'th', online = false, ready = false, joined = false, loading = true;
let quantities = {}, pets = [], ledger = W.freshLedger(), selectedPlayer = null, mode = 'preview', room = null;
let transport = null, view = null, raf = 0, lastFrame = 0, worldTime = 0, lastSent = 0, lastHeartbeat = 0, sequence = 0;
let toastTimer = 0, statusAt = 0, adaptiveAt = 0, meanFrame = 16.7, frameCount = 0, renderMs = 0;
let careBusy = false, pulseBusy = false, lastUI = 0, lastHidden = false;
let pendingWorldAction = null;
let needsKey = 'moojai-world-needs-v1', needs = C.restore(null), resting = false, lastNeedsUI = 0, needsSaveTime = 0;
const startTime = performance.now(), keys = new Set(), peers = new Map(), labels = new Map(), receiveRates = new Map(), lotuses = new Map();
const messageLog = [], evidence = new Map(), sentTimes = [], seenEvents = new Map();
const muteList = read('moojai-world-muted-v1', []), muted = new Set(Array.isArray(muteList) ? muteList.filter(x => typeof x === 'string').slice(-200) : []);
const me = { id: crypto.randomUUID(), name: W.validName(prefs.name) || '', x: W.WORLD.spawn.x, y: W.WORLD.spawn.y, dir: Math.PI, pet: null, followers: [], moving: false, glow: false, phase: 0 };
const demo = [
  { id:'demo-bunny', name:'Luna', pet:'love-R', x:1020, y:1020, phase:1.2 },
  { id:'demo-tiger', name:'Mali', pet:'career-C', x:1320, y:1010, phase:3.6 },
  { id:'demo-capybara', name:'Bua', pet:'wellbeing-C', x:1300, y:1150, phase:5.2 }
].map(d => ({...d, homeX:d.x, homeY:d.y, followers:[],dir:0,moving:false,demo:true}));
const joystick = { x:0, y:0, pointer:null };
const t = key => copy[lang][key] || copy.en[key] || key;
const nickname = actor => actor.demo ? `${actor.name} ${t('demo')}` : actor.name || t('visitor');
function toast(text,duration=4200) { $('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,duration); }
function persistPrefs() { Object.assign(prefs,{language:lang,name:me.name});if(!loading)Object.assign(prefs,{lead:me.pet,followers:me.followers});save(SAVE,prefs); }
function setStatus(next, n) { mode=next;room=n||room;statusAt=performance.now();$('#connection').textContent=t(next)+(room?` · ${t('room')} ${room}`:''); }
function applyLanguage() {
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-text]').forEach(n=>n.textContent=t(n.dataset.text));
  document.querySelectorAll('[data-label]').forEach(n=>n.setAttribute('aria-label',t(n.dataset.label)));
  document.querySelectorAll('[data-placeholder]').forEach(n=>n.setAttribute('placeholder',t(n.dataset.placeholder)));
  $('#language').textContent=lang==='th'?'EN':'ไทย';$('#language').setAttribute('aria-label',lang==='th'?'English':'ภาษาไทย');
  $('#welcome-language').textContent=lang==='th'?'English':'ภาษาไทย';
  $('#world-canvas').setAttribute('aria-label',t('controls'));$('#chat-panel').setAttribute('aria-label',t('chat'));
  const intention=$('#intention').value;
  $('#intention').replaceChildren(...Object.keys(W.species).map(key=>{const o=document.createElement('option');o.value=key;o.textContent=t(key);return o;}));
  if(W.species[intention])$('#intention').value=intention;
  setStatus(mode,room);renderPets();renderMap();renderPlayers();updateHUD();persistPrefs();
}
let urlLead=new URLSearchParams(location.search).get('lead');
function setCollection(q) {
  quantities=q;pets=W.petsFromQuantities(q);
  const owned=new Set(pets.map(p=>p.cardId));
  // A ?lead=<card> link (from the reveal dialog) picks the lead once, only if that card is owned.
  if(urlLead&&owned.has(urlLead)){me.pet=urlLead;me.followers=me.followers.filter(c=>c!==urlLead);urlLead=null;}
  me.pet=owned.has(me.pet)?me.pet:owned.has(prefs.lead)?prefs.lead:pets[0]?.cardId||null;
  me.followers=[...new Set((me.followers.length?me.followers:Array.isArray(prefs.followers)?prefs.followers:[]).filter(c=>owned.has(c)&&c!==me.pet))].slice(0,2);
  for(const pet of pets)needs.pets[pet.cardId] ||= C.normalize(null);
  renderPets();updateHUD();
}
async function loadCollection() {
  setCollection(online?await collection():W.quantitiesFromHistory(read(COLLECTOR,{}).history));
}
function updateHUD() {
  if(!view)return;
  $('#dust').textContent=W.balance(ledger,quantities);me.glow=ledger.glowUntil>Date.now();
  $('#pet-count').textContent=pets.length;$('#empty-banner').hidden=pets.length>0;
  $('#zone-name').textContent=W.zoneAt(me.x,me.y)[lang];
  $('#online-count').textContent=1+peers.size+(online?0:demo.length);
  $('#interact-button').hidden=!ready||!W.nearPavilion(me.x,me.y);
  $('#pray-button').disabled=!W.canPray(ledger)||careBusy;
  $('#pray-button').textContent=t(W.canPray(ledger)?'pray':'prayed');
  $('#map-you').style.left=`${me.x/W.WORLD.width*100}%`;$('#map-you').style.top=`${me.y/W.WORLD.height*100}%`;
  updateNeedsUI();
}
function persistNeeds(){save(needsKey,needs);needsSaveTime=0;}
function feedingStatus(message){const node=$('#feeding-status');if(node.textContent!==message)node.textContent=message;}
function needsMeters(cardId){
  const box=document.createElement('div');box.className='needs-meters';box.dataset.needsCard=cardId;
  for(const kind of ['hunger','energy']){
    const row=document.createElement('div');row.className='need-meter';row.dataset.need=kind;
    const label=document.createElement('span'),value=document.createElement('span'),meter=document.createElement('meter');
    // Hunger is stored internally, but shown as Fullness so both bars read "fuller is better".
    const shown=kind==='hunger'?'fullness':kind;row.dataset.shown=shown;
    label.textContent=t(shown);value.className='need-value';meter.min=0;meter.max=100;
    meter.setAttribute('aria-label',`${W.speciesNames[W.parseCard(cardId).species][lang]} · ${t(shown)}`);
    row.append(label,value,meter);box.append(row);
  }
  return box;
}
function updateNeedsUI(force=false){
  const now=performance.now();if(!force&&now-lastNeedsUI<250)return;lastNeedsUI=now;
  const pet=pets.find(p=>p.cardId===me.pet),current=pet?needs.pets[pet.cardId]:null;
  $('#companion-status').hidden=!pet;
  if(pet){
    $('#active-pet-name').textContent=W.speciesNames[pet.species][lang];
    $('#care-state').textContent=t(resting?'resting':current.energy<25?'tired':current.hunger>=70?'hungry':current.hunger<10?'full':'content');
    $('#rest-button').textContent=t(resting?'wake':'rest');$('#rest-button').setAttribute('aria-pressed',String(resting));
  }
  for(const box of document.querySelectorAll('[data-needs-card]')){
    const current=needs.pets[box.dataset.needsCard];if(!current)continue;
    for(const row of box.children){const kind=row.dataset.need,value=Math.round(kind==='hunger'?100-current.hunger:current[kind]);row.querySelector('.need-value').textContent=value+'%';row.querySelector('meter').value=value;row.dataset.low=String(kind==='hunger'?value<=30:value<=25);}
  }
  const chewing=current&&Date.now()<current.feedReadyAt,full=current&&current.hunger<1;
  document.querySelectorAll('[data-food]').forEach(button=>button.disabled=!pet||chewing||full);
  if($('#feeding-dialog').open){
    if(chewing)feedingStatus(t('chewing'));
    else if(full)feedingStatus(t('alreadyFull'));
    else if($('#feeding-status').dataset.pending==='true'){feedingStatus('');$('#feeding-status').dataset.pending='false';}
  }
}
function openFeeding(){
  if(!me.pet)return;
  $('#pets-dialog').close();
  $('#feeding-title').textContent=W.speciesNames[W.parseCard(me.pet).species][lang];
  $('#feeding-needs').replaceChildren(needsMeters(me.pet));$('#feeding-status').textContent='';$('#feeding-status').dataset.pending='true';
  openDialog('feeding-dialog');updateNeedsUI(true);
}
function stopRest(){resting=false;if(me.action==='sit')me.actionUntil=0;}
function toggleRest(){
  if(!me.pet)return;
  if(resting)stopRest();else{resting=true;me.action='sit';me.actionStarted=performance.now();me.actionUntil=performance.now()+1000;me.dir=view.yaw+.35;$('#pets-dialog').close();$('#feeding-dialog').close();sendState();toast(t('restHint'),2200);}
  updateNeedsUI(true);
}
function feedPet(kind){
  if(!me.pet)return;
  const result=C.feed(needs.pets[me.pet],kind);
  if(!result.ok){$('#feeding-status').textContent=t(result.reason==='full'?'alreadyFull':'chewing');return;}
  stopRest();needs.pets[me.pet]=result.needs;persistNeeds();me.action='feed';me.food=kind;me.actionStarted=performance.now();me.actionUntil=me.actionStarted+4000;me.dir=view.yaw+.35;
  $('#feeding-dialog').close();toast(t('foodEnjoyed'),2200);playChime();updateNeedsUI(true);
  $('#feeding-status').textContent=t('foodEnjoyed');$('#feeding-status').dataset.pending='true';
  reward('feed',{quiet:true}).catch(()=>toast(t('careRewardFailed')));
}
function advanceNeeds(dt){
  if(!ready||!me.pet)return;
  if(me.moving&&resting)stopRest();
  const active=[me.pet,...me.followers];
  for(const id of active)needs.pets[id]=C.advance(needs.pets[id],dt,{moving:me.moving,resting});
  if(resting){me.action='sit';me.actionUntil=performance.now()+1000;if(active.every(id=>needs.pets[id].energy>=100)){stopRest();toast(t('fullyRested'));}}
  needsSaveTime+=dt;if(needsSaveTime>=5)persistNeeds();
}
function petAction(action) {
  if(!me.pet)return;
  if(action==='feed'){openFeeding();return;}
  if(action==='sit'){toggleRest();return;}
  stopRest();
  me.action=action;me.actionUntil=performance.now()+(action==='sit'?30000:2200);
  if(action==='pat'||action==='feed'){view.addEffect(action,me.x/20,me.y/20);reward(action).catch(()=>toast(t('networkError')));}
  else send('emote',{emote:action==='wave'?'👋':action==='sit'?'🌙':'😊'});
  playChime();
}
function renderPets() {
  const list=$('#pet-list');list.replaceChildren();
  if(!pets.length){const p=document.createElement('p');p.textContent=t('noPets');const a=document.createElement('a');a.href='./#ritual';a.textContent=t('drawFirst');list.append(p,a);}
  for(const pet of pets){
    const row=document.createElement('article');row.className='pet-row';row.dataset.card=pet.cardId;
    const art=document.createElement('img');art.src=`assets/cards/${pet.cardId}.webp`;art.alt=W.speciesNames[pet.species][lang];art.loading='lazy';art.width=55;art.height=82;
    const body=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p'),lead=document.createElement('button'),follow=document.createElement('button');
    title.textContent=W.speciesNames[pet.species][lang];detail.textContent=`${pet.rank} · ${t('level')} ${pet.level} · ×${pet.quantity}`;
    lead.textContent=t('lead');lead.dataset.role='lead';lead.setAttribute('aria-pressed',String(me.pet===pet.cardId));
    lead.onclick=()=>{stopRest();me.actionUntil=0;persistNeeds();me.pet=pet.cardId;me.followers=me.followers.filter(c=>c!==me.pet);persistPrefs();renderPets();sendState();};
    follow.textContent=t(me.followers.includes(pet.cardId)?'following':'follow');follow.dataset.role='follow';follow.setAttribute('aria-pressed',String(me.followers.includes(pet.cardId)));follow.disabled=me.pet===pet.cardId;
    follow.onclick=()=>{if(me.followers.includes(pet.cardId))me.followers=me.followers.filter(c=>c!==pet.cardId);else if(me.followers.length<2)me.followers.push(pet.cardId);else toast(t('followersFull'));persistPrefs();renderPets();sendState();};
    body.append(title,detail,needsMeters(pet.cardId),lead,follow);row.append(art,body);list.append(row);
  }
  $('#care-actions').replaceChildren(...['pat','feed','sit','wave','hop'].map(action=>{const button=document.createElement('button');button.textContent=t(action==='sit'?'rest':action);button.dataset.care=action;button.disabled=!me.pet;button.onclick=()=>petAction(action);return button;}));
  $('#care-note').textContent=t('careHint')+' · '+t('localDust');
  $('#compact-needs').replaceChildren(...(me.pet?[needsMeters(me.pet)]:[]));updateNeedsUI(true);
}
function renderMap() {
  $('#map-art').querySelectorAll('.map-zone').forEach(n=>n.remove());$('#zone-list').replaceChildren();
  const positions={pavilion:[50,15],pond:[77,69],grove:[17,24],garden:[18,78],meadow:[47,52]};
  for(const zone of W.zones){const node=document.createElement('span');node.className='map-zone';node.textContent=zone[lang];node.style.left=positions[zone.id][0]+'%';node.style.top=positions[zone.id][1]+'%';node.style.transform='translate(-50%,-50%)';$('#map-art').append(node);const item=document.createElement('span');item.textContent='· '+zone[lang];$('#zone-list').append(item);}
  $('#map-you').setAttribute('title',t('mapYou'));
}
function renderPlayers() {
  $('#player-list').replaceChildren(...[...peers.values(),...(online?[]:demo)].map(player=>{const row=document.createElement('div');row.className='player-row';const name=document.createElement('span');name.textContent=nickname(player);const button=document.createElement('button');button.textContent=t('view');button.onclick=()=>{$('#players-dialog').close();openPlayer(player);};row.append(name,button);return row;}));
}
function openPlayer(player) {
  selectedPlayer=player;$('#player-title').textContent=nickname(player);$('#mute-button').textContent=t(muted.has(player.id)?'unmute':'mute');$('#report-status').textContent=t('reportEvidence');openDialog('player-dialog');
}
function openDialog(id) { keys.clear();joystick.x=joystick.y=0;me.moving=false;sendState();const d=document.getElementById(id);if(!d.open)d.showModal(); }
function addMessage(actor,text,kind='chat') {
  if(muted.has(actor.id))return;
  const filtered=W.filterChat(text).text;if(!filtered)return;
  const entry={id:actor.id,name:nickname(actor),text:filtered,kind};messageLog.push(entry);if(messageLog.length>30)messageLog.shift();
  if(!actor.demo&&actor!==me){const list=evidence.get(actor.id)||[];list.push({text:filtered,at:new Date().toISOString()});evidence.set(actor.id,list.slice(-10));}
  const line=document.createElement('p'),name=document.createElement('b');name.textContent=entry.name+': ';line.append(name,document.createTextNode(filtered));$('#chat-log').append(line);while($('#chat-log').children.length>30)$('#chat-log').firstChild.remove();$('#chat-log').scrollTop=$('#chat-log').scrollHeight;
  actor.bubble=filtered;actor.bubbleUntil=performance.now()+6000;
}
function chatRate(id) { const r=W.rateCheck(receiveRates.get(id)||[],Date.now());receiveRates.set(id,r.times);return r.ok; }
function send(type,extra={}) { if(!joined||!transport)return false;const packet={type,id:me.id,seq:++sequence,...extra};transport.send(packet);return true; }
function stateData(){return W.sanitizeState({...me});}
function sendState(type='state'){send(type,{state:stateData()});lastSent=performance.now();}
function validLotus(item) {
  if(!item||typeof item.key!=='string'||item.key.length>100||!Number.isFinite(item.x)||!Number.isFinite(item.z)||!Number.isFinite(item.expires))return false;
  return item.expires>Date.now()&&item.expires<=Date.now()+3601000&&((item.x-94)/14)**2+((item.z-52)/8.5)**2<1;
}
function addLotus(item){if(!validLotus(item)||lotuses.has(item.key)||lotuses.size>=80)return;lotuses.set(item.key,item);view.lotus(item.key,item.x,item.z,item.expires);if(!online)save(LOTUSES,[...lotuses.values()].filter(l=>l.expires>Date.now()));}
function receive(packet,senderId,roster) {
  if(!packet||packet.id===me.id||packet.id!==senderId||!/^[-a-zA-Z0-9]{6,64}$/.test(senderId)||!['hello','state','chat','emote','lotus','leave','lotus-sync'].includes(packet.type))return;
  const now=performance.now();
  if(packet.type==='leave'){dropPeer(senderId);return;}
  if(!Number.isSafeInteger(packet.seq)||packet.seq<1)return;
  if(packet.seq<=(seenEvents.get(senderId)||0))return;
  seenEvents.set(senderId,packet.seq);
  if(seenEvents.size>128)seenEvents.delete(seenEvents.keys().next().value);
  if(packet.type==='hello'||packet.type==='state'){
    const clean=online?W.authorizeState(packet.state,senderId,roster):W.sanitizeState(packet.state);
    if(!clean||clean.id!==senderId||W.blocked(clean.x,clean.y,8))return;
    let peer=peers.get(senderId);
    if(!peer){if(peers.size>=39)return;peer={...clean,phase:Math.random()*6,samples:[]};peers.set(senderId,peer);renderPlayers();}
    // Incoming positions use the receiver's clock, avoiding forged timestamps.
    peer.samples.push({x:clean.x,y:clean.y,dir:clean.dir,at:now});peer.samples=peer.samples.slice(-12);
    Object.assign(peer,{name:clean.name,pet:clean.pet,followers:clean.followers,glow:clean.glow,moving:clean.moving,lastSeen:now});
    if(packet.type==='hello'){sendState();for(const item of lotuses.values())if(item.expires>Date.now())send('lotus-sync',{lotus:item});}
  }else{
    const peer=peers.get(senderId);if(!peer)return;
    if(packet.type==='chat'&&typeof packet.text==='string'&&packet.text.length<=600&&chatRate(senderId))addMessage(peer,packet.text);
    if(packet.type==='emote'&&W.emotes.includes(packet.emote)&&chatRate(senderId))addMessage(peer,packet.emote,'emote');
    if((packet.type==='lotus'||packet.type==='lotus-sync')&&validLotus(packet.lotus)){
      if(online){ // Only accept lotuses present in the server-owned offering table.
        if(packet.type==='lotus')request('/rest/v1/world_lotuses?select=id,x,z,expires_at&id=eq.'+encodeURIComponent(packet.lotus.key)).then(rows=>{for(const l of rows)addLotus({key:l.id,x:l.x,z:l.z,expires:Date.parse(l.expires_at)});}).catch(()=>{});
      }else addLotus(packet.lotus);
    }
  }
  updateHUD();
}
function dropPeer(id){peers.delete(id);labels.get(id)?.remove();labels.delete(id);receiveRates.delete(id);seenEvents.delete(id);evidence.delete(id);renderPlayers();}
async function join() {
  if(joined||!me.name)return;
  try{
    if(online&&!window.MooJaiAccount.user){toast(t('signin'));window.MooJaiAccount.open('signin');return;}
    transport=online?await onlineTransport({id:me.id,name:me.name,receive,status:setStatus}):previewTransport({id:me.id,receive,status:setStatus});
    joined=true;sendState('hello');await reward('visit');
    if(online){const rows=await request('/rest/v1/world_lotuses?select=id,x,z,expires_at&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=80');for(const l of rows)addLotus({key:l.id,x:l.x,z:l.z,expires:Date.parse(l.expires_at)});}
  }catch{setStatus('offline');toast(t('networkError'));}
}
async function reward(action,{quiet=false}={}) {
  if(careBusy)return;
  careBusy=true;
  try {
    let outcome;
    if(online){
      const pendingKey='moojai-pending-world-'+me.id;
      if(!pendingWorldAction){try{pendingWorldAction=JSON.parse(sessionStorage.getItem(pendingKey)||'null');}catch{}}
      if(pendingWorldAction&&(!['visit','pray','pat','feed','lantern','lotus'].includes(pendingWorldAction.action)||!/^[0-9a-f-]{36}$/i.test(pendingWorldAction.requestId||'')))pendingWorldAction=null;
      // Resolve a lost response before spending on a different action.
      if(pendingWorldAction&&pendingWorldAction.action!==action){const recovered=await request('/functions/v1/world-action',{method:'POST',body:pendingWorldAction});ledger=W.restoreLedger(recovered.ledger);if(recovered.lotus)addLotus(recovered.lotus);pendingWorldAction=null;}
      pendingWorldAction ||= {action,requestId:crypto.randomUUID()};
      try{sessionStorage.setItem(pendingKey,JSON.stringify(pendingWorldAction));}catch{}
      const result=await request('/functions/v1/world-action',{method:'POST',body:pendingWorldAction});
      pendingWorldAction=null;try{sessionStorage.removeItem(pendingKey);}catch{}
      ledger=W.restoreLedger(result.ledger);outcome=result;
      // An idempotent replay can be older than an action from another tab.
      const latest=await request('/rest/v1/world_state?select=ledger').catch(()=>null);
      if(latest?.[0])ledger=W.restoreLedger(latest[0].ledger);
    }else{
      const work=()=>{
        const current=W.restoreLedger(read(LEDGER,ledger));
        let r;
        if(action==='visit')r=W.claimVisit(current);
        else if(action==='pray')r=W.pray(current);
        else if(action==='pat'||action==='feed')r=me.pet?W.carePet(current):{ledger:current,gained:0};
        else r=W.makeOffering(current,quantities,action);
        ledger=r.ledger;save(LEDGER,ledger);return r;
      };
      outcome=navigator.locks?await navigator.locks.request(LEDGER,work):work();
    }
    if(outcome.gained&&!quiet)toast(action==='visit'?t('visitDust'):`${t('dustEarned')} +${outcome.gained} ✦`);
    if((action==='pat'||action==='feed')&&!quiet){if(!outcome.gained)toast(t('careLimit'));}
    if(action==='pray'){
      const ok=outcome.ok!==false&&outcome.gained>0;
      if(ok){stopRest();me.action='pray';me.actionUntil=performance.now()+2600;view.addEffect('pray',me.x/20,me.y/20);$('#reflection').textContent=W.reflectionFor($('#intention').value)[lang==='th'?0:1];playChime();}
      else toast(t('prayed'));
      $('#private-wish').value='';
    }
    if(action==='lantern'||action==='lotus'){
      if(outcome.ok===false)toast(t('insufficient'));
      else if(action==='lantern'){toast(t('lanternLit'));playChime();}
      else{const item=outcome.lotus||{key:crypto.randomUUID(),x:90+Math.random()*7,z:49+Math.random()*6,expires:Date.now()+3600000};addLotus(item);send('lotus',{lotus:item});toast(t('lotusFloated'));playChime();}
    }
    updateHUD();sendState();
  }finally{careBusy=false;updateHUD();}
}
let audioContext=null,audioTimer=null;
function playChime(){if(!prefs.sound)return;audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});const now=audioContext.currentTime;for(let i=0;i<3;i++){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=[523.25,659.25,783.99][i];g.gain.setValueAtTime(0,now+i*.17);g.gain.linearRampToValueAtTime(.025,now+i*.17+.02);g.gain.exponentialRampToValueAtTime(.0001,now+i*.17+1.1);o.connect(g);g.connect(audioContext.destination);o.start(now+i*.17);o.stop(now+i*.17+1.2);}}
function setSound(on){prefs.sound=on;clearInterval(audioTimer);if(on){playChime();audioTimer=setInterval(()=>{if(!document.hidden)playChime();},14000);}else audioContext?.suspend();persistPrefs();}
function drawLabels(actors,now){
  const active=new Set();for(const actor of actors){active.add(actor.id);let label=labels.get(actor.id);if(!label){label=document.createElement('div');label.className='world-label';const bubble=document.createElement('span');bubble.className='bubble';const name=document.createElement('span');name.className='name-tag';label.append(bubble,name);$('#world-labels').append(label);labels.set(actor.id,label);}
    const screen=view.project(actor.x/20,actor.y/20,actor.pet?.startsWith('love-')?3.2:2.55);label.hidden=!screen.visible||Math.hypot(actor.x-me.x,actor.y-me.y)>850;label.style.transform=`translate(${screen.x}px,${screen.y}px) translate(-50%,-100%)`;label.lastChild.textContent=actor===me?me.name||t('littleStar'):nickname(actor);label.firstChild.textContent=!muted.has(actor.id)&&actor.bubbleUntil>now?actor.bubble:'';
  }for(const[id,label]of labels)if(!active.has(id)){label.remove();labels.delete(id);}
}
function updatePeers(now){
  for(const[id,p]of peers){if(now-p.lastSeen>8000){dropPeer(id);continue;}const target=now-100,s=p.samples;let a=s[0],b=s[s.length-1];for(let i=0;i<s.length-1;i++)if(s[i].at<=target&&s[i+1].at>=target){a=s[i];b=s[i+1];break;}const alpha=a===b?1:Math.max(0,Math.min(1,(target-a.at)/(b.at-a.at)));p.x=a.x+(b.x-a.x)*alpha;p.y=a.y+(b.y-a.y)*alpha;p.dir=b.dir;}
}
function animate(now){
  if(document.hidden){lastFrame=0;return;}
  // Simulate real elapsed time in small sub-steps so slow devices move at the
  // same speed as fast ones (no slow motion) while collisions stay accurate.
  // Long stalls are capped so a hitch never teleports the pet.
  const elapsed=lastFrame?now-lastFrame:16.7;lastFrame=now;
  const frameDt=Math.min(.5,elapsed/1000),steps=Math.max(1,Math.ceil(frameDt/.05)),dt=frameDt/steps;
  worldTime+=frameDt;frameCount++;
  // Slow frames must count, or adaptive resolution never engages on weak devices.
  if(frameCount>30&&elapsed<1000)meanFrame=meanFrame*.97+Math.min(elapsed,250)*.03;
  const inDialog=Boolean(document.querySelector('dialog[open]')),inInput=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  let x=0,z=0;
  if(ready&&!inDialog&&!inInput){x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.x;z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joystick.y;}
  const dx=x*Math.cos(view.yaw)+z*Math.sin(view.yaw),dz=z*Math.cos(view.yaw)-x*Math.sin(view.yaw),wasMoving=me.moving;
  let movedAny=false;for(let i=0;i<steps;i++){const next=W.step(me,dx,dz,175,dt);me.x=next.x;me.y=next.y;movedAny||=next.moved;}me.moving=movedAny;
  if(me.moving){me.dir=Math.atan2(dx,dz);if(me.action==='sit'||me.action==='feed')me.actionUntil=0;}
  advanceNeeds(frameDt);
  if(joined&&((me.moving&&now-lastSent>=100)||wasMoving!==me.moving))sendState();
  if(joined&&now-lastHeartbeat>=3000){lastHeartbeat=now;sendState();if(!pulseBusy){pulseBusy=true;transport.pulse().catch(async error=>{setStatus('offline');if(error.message==='room_changed'){await transport.close();joined=false;await join();}}).finally(()=>pulseBusy=false);}}
  updatePeers(now);
  if(!online)for(const d of demo){const moving=Math.sin(worldTime*.4+d.phase)>.1;const nx=d.homeX+Math.sin(worldTime*.13+d.phase)*60,ny=d.homeY+Math.cos(worldTime*.12+d.phase)*45;const n=W.step(d,nx-d.x,ny-d.y,moving?23:0,frameDt);d.moving=n.moved;if(d.moving)d.dir=Math.atan2(n.x-d.x,n.y-d.y);d.x=n.x;d.y=n.y;}
  const actors=[me,...peers.values(),...(online?[]:demo)];const before=performance.now();view.render(actors,me,worldTime,frameDt);renderMs=renderMs*.95+(performance.now()-before)*.05;
  if(now-lastUI>50){drawLabels(actors,now);updateHUD();lastUI=now;}
  if(now-adaptiveAt>2000&&frameCount>60){adaptiveAt=now;if(meanFrame>20)view.setScale(view.scale*.85);else if(meanFrame<17.5&&view.scale<(prefs.performance?.75:1))view.setScale(view.scale+.05);}
  for(const[k,l]of lotuses)if(l.expires<Date.now())lotuses.delete(k);
  raf=requestAnimationFrame(animate);
}
function setupControls(){
  window.addEventListener('keydown',e=>{
    if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]'))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
    if(e.code==='Enter'&&e.target===$('#world-canvas')){e.preventDefault();$('#chat-panel').dataset.collapsed='false';$('#chat-toggle').setAttribute('aria-expanded','true');$('#chat-input').focus();}
    if(e.code==='KeyE'&&W.nearPavilion(me.x,me.y)){e.preventDefault();openDialog('pavilion-dialog');}
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();joystick.x=joystick.y=0;});
  let drag=null;
  const canvas=$('#world-canvas');
  canvas.addEventListener('pointerdown',e=>{if(drag)return;canvas.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY,total:0};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.total+=Math.abs(dx)+Math.abs(dy);view.orbit(dx,dy);drag.x=e.clientX;drag.y=e.clientY;});
  canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(drag.total<8){for(const p of [...peers.values(),...(online?[]:demo)]){const q=view.project(p.x/20,p.y/20,1.3);if(q.visible&&Math.hypot(q.x-e.clientX,q.y-e.clientY)<42){openPlayer(p);break;}}}drag=null;});
  canvas.addEventListener('pointercancel',()=>drag=null);
  const joy=$('#joystick');
  function moveJoy(e){const b=joy.getBoundingClientRect(),dx=e.clientX-b.x-b.width/2,dy=e.clientY-b.y-b.height/2,len=Math.max(32,Math.hypot(dx,dy));joystick.x=dx/len;joystick.y=dy/len;$('#joystick-knob').style.transform=`translate(${joystick.x*28}px,${joystick.y*28}px)`;}
  joy.addEventListener('pointerdown',e=>{if(joystick.pointer!==null)return;joystick.pointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e);});
  joy.addEventListener('pointermove',e=>{if(joystick.pointer===e.pointerId)moveJoy(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(event,e=>{if(joystick.pointer===e.pointerId){joystick.pointer=null;joystick.x=joystick.y=0;$('#joystick-knob').style.transform='';}});
}
function setupUI(){
  $('#feed-button').onclick=openFeeding;$('#rest-button').onclick=toggleRest;
  document.querySelectorAll('[data-food]').forEach(button=>button.onclick=()=>feedPet(button.dataset.food));
  $('#language').onclick=()=>{lang=lang==='th'?'en':'th';applyLanguage();};
  $('#welcome-language').onclick=$('#language').onclick;
  for(const[button,dialog]of [['pets-button','pets-dialog'],['map-button','map-dialog'],['players-button','players-dialog'],['settings-button','settings-dialog'],['interact-button','pavilion-dialog']])$('#'+button).onclick=()=>{if(button==='players-button')renderPlayers();if(button==='settings-button')$('#performance-readout').textContent=`${meanFrame.toFixed(1)} ms · ${view.metrics.drawCalls} draws · ${Math.round(view.metrics.triangles/1000)}k triangles · ${Math.round(view.scale*100)}%`;openDialog(dialog);};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{if(d.id==='pavilion-dialog'){$('#private-wish').value='';$('#release-text').value='';}$('#world-canvas').focus({preventScroll:true});}));
  $('#welcome-dialog').addEventListener('cancel',e=>e.preventDefault());
  $('#welcome-form').onsubmit=async e=>{e.preventDefault();const name=W.validName($('#nickname').value);if(!name){$('#name-error').textContent=t('badName');return;}me.name=name;persistPrefs();$('#welcome-dialog').close();await join();};
  $('#chat-toggle').onclick=()=>{const collapsed=$('#chat-panel').dataset.collapsed!=='true';$('#chat-panel').dataset.collapsed=String(collapsed);$('#chat-toggle').setAttribute('aria-expanded',String(!collapsed));};
  function sendChat(text,emote=false){if(!joined){toast(t(online?'signin':'welcome'));return;}const rate=W.rateCheck(sentTimes,Date.now());if(!rate.ok){toast(t('waitChat'));return;}const filtered=W.filterChat(text);if(!filtered.text)return;sentTimes.splice(0,sentTimes.length,...rate.times);send(emote?'emote':'chat',emote?{emote:text}:{text:filtered.text});addMessage(me,filtered.text);if(filtered.hidden)toast(t('filtered'));}
  $('#chat-form').onsubmit=e=>{e.preventDefault();sendChat($('#chat-input').value);$('#chat-input').value='';};
  $('#chat-input').addEventListener('keydown',e=>{if(e.code==='Escape')$('#world-canvas').focus();});
  $('#emotes').replaceChildren(...W.emotes.map(emote=>{const b=document.createElement('button');b.textContent=emote;b.setAttribute('aria-label',emote);b.onclick=()=>sendChat(emote,true);return b;}));
  $('#performance-mode').checked=!!prefs.performance;$('#performance-mode').onchange=e=>{prefs.performance=e.target.checked;view.setPerformance(prefs.performance);persistPrefs();};
  $('#sound').checked=false;prefs.sound=false;$('#sound').onchange=e=>setSound(e.target.checked);
  $('#time-of-day').value=['day','night','auto'].includes(prefs.time)?prefs.time:'auto';view.setTime($('#time-of-day').value);$('#time-of-day').onchange=e=>{prefs.time=e.target.value;view.setTime(prefs.time);persistPrefs();};
  $('#bug-button').onclick=()=>{$('#settings-dialog').close();$('#bug-report-button')?.click();};
  $('#pray-button').onclick=()=>reward('pray').catch(()=>toast(t('networkError')));
  document.querySelectorAll('[data-offering]').forEach(b=>b.onclick=()=>reward(b.dataset.offering).catch(()=>toast(t('networkError'))));
  $('#release-button').onclick=()=>{if(!$('#release-text').value.trim())return;$('#release-text').value='';view.addEffect('release',me.x/20,me.y/20);toast(t('released'));playChime();$('#pavilion-dialog').close();};
  $('#mute-button').onclick=()=>{if(!selectedPlayer)return;const id=selectedPlayer.id;if(muted.has(id)){muted.delete(id);toast(t('unmuted'));}else{muted.add(id);selectedPlayer.bubble='';toast(t('muted'));}save('moojai-world-muted-v1',[...muted].slice(-200));$('#mute-button').textContent=t(muted.has(id)?'unmute':'mute');};
  $('#report-button').onclick=async()=>{
    if(!selectedPlayer)return;if(!online||selectedPlayer.demo){$('#report-status').textContent=t('previewReport');return;}
    const button=$('#report-button');button.disabled=true;
    try{await request('/rest/v1/chat_reports',{method:'POST',body:{reporter_id:me.id,reported_id:selectedPlayer.id,reason:$('#report-reason').value,messages:(evidence.get(selectedPlayer.id)||[]).slice(-10)}});$('#report-status').textContent=t('reportSent');}catch{$('#report-status').textContent=t('reportFailed');}finally{button.disabled=false;}
  };
  window.addEventListener('storage',e=>{if(e.key===COLLECTOR&&!online)loadCollection();if(e.key==='moojai-collection-update-v1'&&online)loadCollection().catch(()=>toast(t('collectionError')));if(e.key===LEDGER&&!online){ledger=W.restoreLedger(e.newValue);updateHUD();}if(e.key==='moojai-auth-v1'&&online)location.reload();});
  window.addEventListener('storage',e=>{if(e.key===needsKey){needs=C.restore(read(needsKey,null));for(const pet of pets)needs.pets[pet.cardId] ||= C.normalize(null);updateNeedsUI(true);}});
  document.addEventListener('moojai:auth',()=>{if(ready&&online&&window.MooJaiAccount.user?.id!==me.id)location.reload();});
  document.addEventListener('visibilitychange',()=>{
    keys.clear();joystick.x=joystick.y=0;
    if(document.hidden){persistNeeds();lastHidden=true;cancelAnimationFrame(raf);me.moving=false;sendState();audioContext?.suspend();$('#private-wish').value='';$('#release-text').value='';}
    else if(lastHidden){lastHidden=false;lastFrame=0;if(joined)sendState('hello');loadCollection().catch(()=>toast(t('collectionError')));raf=requestAnimationFrame(animate);}
  });
  window.addEventListener('pagehide',()=>{persistNeeds();send('leave');transport?.close();joined=false;cancelAnimationFrame(raf);clearInterval(audioTimer);});
  canvasContextEvents();
}
function canvasContextEvents(){const c=$('#world-canvas');c.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);toast(t('loadFailed'));});c.addEventListener('webglcontextrestored',()=>location.reload());}
async function start(){
  online=!!window.MooJaiAccount?.enabled;
  if(online&&window.MooJaiAccount.user)me.id=window.MooJaiAccount.user.id;
  needsKey='moojai-world-needs-v1'+(online?':'+me.id:'');needs=C.restore(read(needsKey,null));
  prefs.performance=typeof prefs.performance==='boolean'?prefs.performance:reducedMotion;
  try{
    // Paint a useful loading screen before downloading and constructing the 3D world.
    applyLanguage();
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    const { createScene } = await import('./world-scene.js');
    view=createScene($('#world-canvas'),{performanceMode:prefs.performance,reducedMotion});$('#load-progress').value=65;
    setupControls();setupUI();applyLanguage();raf=requestAnimationFrame(animate);
    if(online&&!window.MooJaiAccount.user){setStatus('signin');$('#loading').hidden=true;window.MooJaiAccount.open('signin');ready=true;loading=false;return;}
    await loadCollection();ledger=online?W.freshLedger():W.restoreLedger(read(LEDGER,null));
    if(!online){const saved=read(LOTUSES,[]);if(Array.isArray(saved))for(const l of saved.slice(-80))addLotus(l);}
    $('#load-progress').value=100;$('#loading').hidden=true;ready=true;loading=false;
    const intro=document.createElement('p');intro.dataset.text='emptyChat';intro.textContent=t('emptyChat');$('#chat-log').append(intro);
    if(innerWidth<760){$('#chat-panel').dataset.collapsed='true';$('#chat-toggle').setAttribute('aria-expanded','false');}
    if(me.name)await join();else openDialog('welcome-dialog');
    if(!storageOK)toast(t('storageUnavailable'));
  }catch(error){loading=false;$('#loading h2').textContent=t('loadFailed');$('#loading p').textContent=error.message==='signin'?t('signin'):online?t('collectionError'):t('loadFailed');$('#load-progress').hidden=true;}
}
// Read-only diagnostics for performance checks; no teleport or inventory mutation hooks.
window.MooJaiWorld=Object.freeze({snapshot:()=>({ready,loading,online,joined,mode,room,me:stateData(),peers:[...peers.values()].map(p=>W.sanitizeState(p)),pets:pets.map(p=>({...p})),needs:C.restore(needs),resting,animation:view?.animation,ledger:{...ledger},lotuses:[...lotuses.values()],metrics:{...view?.metrics,frameMs:meanFrame,renderMs,frames:frameCount,seconds:(performance.now()-startTime)/1000}})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
