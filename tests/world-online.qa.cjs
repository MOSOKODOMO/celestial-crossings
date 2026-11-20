// Browser integration with deterministic Supabase HTTP/channel doubles. No live account is touched.
const assert=require('node:assert/strict');
const {launch,BASE}=require('./qa-browser.cjs');
const E=require('../dist/collect-engine.js');
const W=require('../dist/world-core.js');
const A='aaaaaaaa-1111-4111-8111-111111111111',B='bbbbbbbb-2222-4222-8222-222222222222';
const config=`window.MOOJAI_CONFIG={version:'test',supabaseUrl:'https://demo.supabase.co',supabaseAnonKey:'public-test',githubRepo:'MOSOKODOMO/celestial-crossings'};`;
const vendor=`window.__worldMock={channels:new Map(),sent:[],tokens:[]};window.supabase={createClient(){return{realtime:{async setAuth(t){__worldMock.tokens.push(t)},disconnect(){}},channel(topic,options){const callbacks={};const c={topic,options,on(type,filter,fn){callbacks[type]=fn;return c},subscribe(fn){queueMicrotask(()=>fn('SUBSCRIBED'));return c},async track(p){__worldMock.sent.push({topic,presence:p})},async send(p){__worldMock.sent.push({topic,...p});return'ok'},inject(p){callbacks.broadcast?.({payload:p})}};__worldMock.channels.set(topic,c);return c},async removeChannel(c){__worldMock.channels.delete(c.topic)},async removeAllChannels(){__worldMock.channels.clear()}}}};`;
(async()=>{
 const browser=await launch();const errors=[],drawRequests=[];
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  let state=E.initialState(),quantities={},ledger=W.freshLedger(),failDraw=false,replyLost=false,lastDraw=null,rewardReplyLost=false;
  const rewardResults=new Map(),rewardRequests=[];
  let seq=0;
  await context.addInitScript(({A})=>{
    localStorage.setItem('moojai-auth-v1',JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:A,email:'test@example.test'}}));
    localStorage.setItem('moojai-world-v1',JSON.stringify({name:'Mali',language:'en'}));
    localStorage.setItem('celestial-atelier-preview-v1',JSON.stringify({history:[{cardId:'love-SSR'}]}));
  },{A});
  await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:config}));
  await context.route('**/vendor/supabase.js',r=>r.fulfill({contentType:'text/javascript',body:vendor}));
  await context.route('https://demo.supabase.co/**',async r=>{
    const url=new URL(r.request().url()),body=r.request().postDataJSON();
    const ok=data=>r.fulfill({contentType:'application/json',body:JSON.stringify(data),headers:{'Access-Control-Allow-Origin':'*'}});
    if(url.pathname==='/rest/v1/draw_state')return ok([{state}]);
    if(url.pathname==='/rest/v1/charm_collection')return ok(Object.entries(quantities).map(([card_id,quantity])=>({card_id,quantity})));
    if(url.pathname==='/functions/v1/draw'){
      drawRequests.push(body);
      if(failDraw)return r.fulfill({status:503,contentType:'application/json',body:'{"error":"server"}'});
      if(lastDraw?.id===body.requestId)return ok({...lastDraw.out,replayed:true});
      const out=E.draw(state,()=>.2);state=out.state;quantities[out.card.id]=(quantities[out.card.id]||0)+1;lastDraw={id:body.requestId,out:{state,result:out.result}};
      if(replyLost){replyLost=false;return r.abort('failed');}
      return ok(lastDraw.out);
    }
    if(url.pathname==='/rest/v1/rpc/world_join')return ok({room:1});
    if(url.pathname==='/rest/v1/rpc/world_touch'||url.pathname==='/rest/v1/rpc/world_leave')return ok(null);
    if(url.pathname==='/rest/v1/rpc/world_members')return ok([{user_id:A,display_name:'Mali',card_ids:Object.keys(quantities)},{user_id:B,display_name:'Bua',card_ids:['career-R']}]);
    if(url.pathname==='/rest/v1/world_lotuses')return ok([]);
    if(url.pathname==='/rest/v1/world_state')return ok([{ledger}]);
    if(url.pathname==='/functions/v1/world-action'){
      rewardRequests.push(body);
      if(rewardResults.has(body.requestId))return ok(rewardResults.get(body.requestId));
      const out=body.action==='visit'?W.claimVisit(ledger):W.carePet(ledger);ledger=out.ledger;rewardResults.set(body.requestId,out);
      if(rewardReplyLost){rewardReplyLost=false;return r.abort('failed');}
      return ok(out);
    }
    if(url.pathname==='/rest/v1/chat_reports')return ok(null);
    if(url.pathname==='/auth/v1/logout')return ok({});
    return r.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(BASE+'/');
  await page.waitForFunction(()=>!document.querySelector('.card-pick').disabled);
  failDraw=true;await page.locator('.card-pick').first().click();await page.waitForFunction(()=>document.querySelector('#draw-label').textContent.includes('Could not reach'));
  assert.equal(state.total,0);assert.equal(await page.locator('#reveal-dialog').evaluate(d=>d.open),false);
  const firstId=drawRequests[0].requestId;
  failDraw=false;replyLost=true;await page.locator('.card-pick').first().click();await page.waitForFunction(()=>document.querySelector('#draw-label').textContent.includes('Could not'));
  assert.equal(state.total,1);
  await page.locator('.card-pick').first().click();await page.waitForFunction(()=>document.querySelector('#reveal-dialog').open);
  assert.equal(state.total,1,'retry did not draw twice');assert.ok(drawRequests.every(r=>r.requestId===firstId));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('celestial-atelier-preview-v1')).history[0].cardId),'love-SSR','online draw never writes preview inventory');
  await page.locator('#close-reveal').click();await page.click('#collection-nav');
  assert.equal(await page.locator('#reset-button').isDisabled(),true);
  const world=await context.newPage();world.on('pageerror',e=>errors.push(e.message));await world.goto(BASE+'/world.html');await world.waitForFunction(()=>MooJaiWorld.snapshot().joined);
  assert.equal(await world.evaluate(()=>MooJaiWorld.snapshot().me.pet),'career-R','online collection replaces the forged local SSR');
  assert.equal(await world.evaluate(()=>MooJaiWorld.snapshot().pets.length),1);
  await world.click('#pets-button');rewardReplyLost=true;await world.click('[data-care=pat]');
  await world.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Could not connect'));
  await world.click('[data-care=pat]');await world.waitForFunction(()=>MooJaiWorld.snapshot().ledger.careCount===1);
  assert.equal(ledger.careCount,1);assert.equal(new Set(rewardRequests.filter(r=>r.action==='pat').map(r=>r.requestId)).size,1,'care retries reuse the request ID');
  await world.locator('#pets-dialog [data-close]').click();
  quantities['growth-C']=1;
  await page.evaluate(({A})=>localStorage.setItem('moojai-collection-update-v1',JSON.stringify({userId:A,at:Date.now()})),{A});
  await world.waitForFunction(()=>MooJaiWorld.snapshot().pets.length===2);
  assert.equal(await world.evaluate(()=>[...__worldMock.channels.values()].every(c=>c.options.config.private)),true);
  assert.ok(await world.evaluate(()=>__worldMock.tokens.every(t=>t==='test-access')));
  async function inject(p){await world.evaluate(({B,p})=>__worldMock.channels.get('world:lobby-1:'+B).inject(p),{B,p});}
  await inject({type:'state',id:B,seq:++seq,state:{id:B,name:'Bua',x:1220,y:1050,pet:'love-SSR',followers:['wealth-SSR','career-R']}});
  await world.waitForFunction(()=>MooJaiWorld.snapshot().peers.length===1);
  let peer=await world.evaluate(()=>MooJaiWorld.snapshot().peers[0]);assert.equal(peer.pet,null);assert.deepEqual(peer.followers,['career-R']);
  await inject({type:'state',id:B,seq:++seq,state:{id:A,name:'Spoof',x:1220,y:1050,pet:'career-R'}});assert.equal(await world.evaluate(()=>MooJaiWorld.snapshot().peers[0].name),'Bua');
  await inject({type:'state',id:B,seq:++seq,state:{id:B,name:'Bua',x:1220,y:1050,pet:'career-R'}});assert.equal(await world.evaluate(()=>MooJaiWorld.snapshot().peers[0].pet),'career-R');
  await inject({type:'chat',id:B,seq:++seq,text:'hello <img src=x onerror=alert(1)> www.scam.com'});
  assert.equal(await world.locator('#chat-log img').count(),0);assert.doesNotMatch(await world.locator('#chat-log').innerText(),/scam\.com/);
  await world.fill('#chat-input','hello');await world.locator('#chat-form button').click();
  assert.equal(await world.evaluate(({A})=>__worldMock.sent.filter(p=>p.type==='broadcast').every(p=>p.topic==='world:lobby-1:'+A),{A}),true);
  await world.locator('#world-canvas').focus();
  await world.keyboard.down('KeyW');await world.waitForTimeout(700);await world.keyboard.up('KeyW');
  assert.ok(await world.evaluate(()=>__worldMock.sent.filter(p=>p.presence).length<6),'movement does not broadcast Presence at 10 Hz');
  await context.close();assert.deepEqual(errors,[]);
  // Configured but signed-out worlds ask for account login and never expose a preview collection.
  const guest=await browser.newContext();await guest.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:config}));
  const unsigned=await guest.newPage();await unsigned.goto(BASE+'/world.html');await unsigned.waitForFunction(()=>document.querySelector('#account-dialog')?.open);assert.equal(await unsigned.evaluate(()=>MooJaiWorld.snapshot().joined),false);assert.equal(await unsigned.evaluate(()=>MooJaiWorld.snapshot().me.pet),null);await guest.close();
  console.log('Passed: online draws, idempotent retries, preview separation, account gate, private topics, forged presence/ownership, chat escaping and filtered receive.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
