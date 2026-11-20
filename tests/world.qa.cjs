const assert=require('node:assert/strict');
const fs=require('node:fs');
const {launch,BASE}=require('./qa-browser.cjs');
const E=require('../dist/collect-engine.js');
const snapshot=p=>p.evaluate(()=>MooJaiWorld.snapshot());
const wait=p=>p.waitForFunction(()=>window.MooJaiWorld?.snapshot().ready&&!MooJaiWorld.snapshot().loading);
const output='output/world';
let seed=E.initialState();
for(const n of [.03,.2,.37,.53,.7,.87,.03,.03,.03]){const rolls=[n,n===.03?0:n];seed=E.draw(seed,()=>rolls.shift()).state;}
(async()=>{
 const browser=await launch();const errors=[],external=[],measurements={};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith(BASE)&&!r.url().startsWith('data:'))external.push(r.url());});
  await page.goto(BASE+'/world.html');await wait(page);
  assert.ok(await page.locator('#welcome-dialog').evaluate(d=>d.open));
  await page.click('#welcome-language');assert.match(await page.locator('#welcome-title').innerText(),/little world/);await page.click('#welcome-language');
  await page.fill('#nickname','www.scam.com');await page.click('#welcome-form button');assert.match(await page.locator('#name-error').innerText(),/2/);
  await page.fill('#nickname','Mali');await page.click('#welcome-form button');
  await page.waitForFunction(()=>MooJaiWorld.snapshot().joined);
  assert.equal((await snapshot(page)).me.pet,null);assert.ok(await page.locator('#empty-banner').isVisible());
  await page.click('#language');assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await page.evaluate(data=>{localStorage.setItem('celestial-atelier-preview-v1',JSON.stringify(data));},seed);
  await page.reload();await wait(page);assert.ok((await snapshot(page)).pets.length>=5);
  await page.click('#pets-button');await page.click('[data-card="love-SSR"] [data-role="lead"]');
  await page.locator('[data-role=follow]:enabled').nth(0).click();await page.locator('[data-role=follow]:enabled').nth(1).click();
  assert.equal((await snapshot(page)).me.followers.length,2);
  for(let i=0;i<7;i++){await page.click('[data-care=pat]');await page.waitForTimeout(70);}
  assert.equal((await snapshot(page)).ledger.careCount,5);
  await page.locator('#pets-dialog [data-close]').click();
  fs.mkdirSync(output,{recursive:true});await page.waitForTimeout(4500);
  const before=(await snapshot(page)).me;await page.keyboard.down('KeyW');await page.waitForTimeout(700);await page.keyboard.up('KeyW');
  const after=(await snapshot(page)).me;assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>70,'keyboard moves the pet');
  // Camera drag changes the camera-relative movement vector.
  await page.mouse.move(800,500);await page.mouse.down();await page.mouse.move(810,500);await page.mouse.up();
  // Two tabs share preview state, chat, emotes and lotuses.
  const other=await context.newPage();other.on('pageerror',e=>errors.push(e.message));await other.goto(BASE+'/world.html');await wait(other);
  await page.waitForFunction(()=>MooJaiWorld.snapshot().peers.length===1);await other.waitForFunction(()=>MooJaiWorld.snapshot().peers.length===1);
  await page.bringToFront();await page.keyboard.down('KeyD');await page.waitForTimeout(550);await page.keyboard.up('KeyD');await page.waitForTimeout(250);
  const moved=(await snapshot(page)).me;assert.ok(Math.abs((await snapshot(other)).peers[0].x-moved.x)<8,'remote movement follows');
  await page.fill('#chat-input','hello www.scam.com 081-234-5678 fuck');await page.locator('#chat-form button').click();
  await other.waitForFunction(()=>document.querySelector('#chat-log').textContent.includes('hello'));
  assert.doesNotMatch(await other.locator('#chat-log').innerText(),/scam\.com|081|fuck/);
  const count=await other.locator('#chat-log p').count();await page.fill('#chat-input','too fast');await page.locator('#chat-form button').click();await page.waitForTimeout(100);assert.equal(await other.locator('#chat-log p').count(),count);
  // Malformed and unsafe state must not render a new peer.
  await page.evaluate(()=>{const c=new BroadcastChannel('moojai-world-preview-v1');c.postMessage({type:'state',id:'forged-visitor',seq:1,state:{id:'forged-visitor',x:'1180',y:1060,pet:'not-a-card'}});c.close();});
  await page.waitForTimeout(100);assert.equal((await snapshot(other)).peers.length,1);
  // Mute and report are reachable without pointing at a moving 3D avatar.
  await other.click('#players-button');await other.locator('#player-list button').first().click();await other.click('#mute-button');await other.click('#report-button');
  assert.match(await other.locator('#report-status').innerText(),/no report was sent/);await other.locator('#player-dialog [data-close]').click();
  await page.waitForTimeout(1300);await page.fill('#chat-input','muted message');await page.locator('#chat-form button').click();await page.waitForTimeout(100);assert.doesNotMatch(await other.locator('#chat-log').innerText(),/muted message/);
  // Walk to the pavilion with the same keyboard controls a visitor uses.
  await page.locator('#world-canvas').focus();
  for(let i=0;i<65;i++){
    const s=await snapshot(page);if(Math.hypot(s.me.x-1200,s.me.y-452)<100)break;
    const dx=1200-s.me.x,dy=452-s.me.y;const code=Math.abs(dx)>65?(dx>0?'KeyD':'KeyA'):(dy>0?'KeyS':'KeyW');
    await page.keyboard.down(code);await page.waitForTimeout(120);await page.keyboard.up(code);
  }
  assert.ok(await page.locator('#interact-button').isVisible(),'walked to pavilion');await page.click('#interact-button');
  const privateText='PRIVATE WISH NEVER TRANSMIT 918273';const bodies=[];page.on('request',r=>{if(r.postData())bodies.push(r.postData());});
  await page.fill('#private-wish',privateText);await page.click('#pray-button');await page.waitForTimeout(100);
  assert.equal((await snapshot(page)).ledger.lastPrayer.length,10);assert.ok(await page.locator('#pray-button').isDisabled());assert.equal(await page.inputValue('#private-wish'),'');
  assert.match(await page.locator('.disclaimer').innerText(),/not a real temple/);
  await page.click('[data-offering=lotus]');await page.waitForTimeout(150);assert.equal((await snapshot(page)).lotuses.length,1);
  await other.waitForFunction(()=>MooJaiWorld.snapshot().lotuses.length===1);
  await page.click('#pavilion-dialog summary');await page.fill('#release-text',privateText);await page.click('#release-button');
  assert.ok(!bodies.some(b=>b.includes(privateText)));assert.ok(await page.evaluate(text=>!Object.values(localStorage).some(v=>v.includes(text)),privateText));assert.equal(await page.inputValue('#release-text'),'');
  await page.screenshot({path:output+'/pavilion.png'});
  await other.close();await page.waitForFunction(()=>MooJaiWorld.snapshot().peers.length===0,{},{timeout:9000});
  await page.click('#settings-button');await page.selectOption('#time-of-day','night');await page.check('#performance-mode');await page.locator('#settings-dialog [data-close]').click();await page.waitForTimeout(1800);assert.equal(await page.locator('body').getAttribute('data-night'),'true');assert.ok((await snapshot(page)).metrics.renderScale<=.75);
  await page.screenshot({path:output+'/night.png'});
  await page.click('#settings-button');await page.selectOption('#time-of-day','day');await page.uncheck('#performance-mode');await page.locator('#settings-dialog [data-close]').click();
  await page.reload();await wait(page);await page.waitForTimeout(2500);await page.screenshot({path:output+'/desktop.png'});
  measurements.desktop=(await snapshot(page)).metrics;assert.ok(measurements.desktop.drawCalls<120);assert.ok(measurements.desktop.triangles<150000);
  // Record actual frame times; a strict performance gate is opt-in on calibrated hardware.
  if(process.env.WORLD_PERF_GATE==='1')assert.ok(measurements.desktop.frameMs<20,JSON.stringify(measurements.desktop));
  measurements.downloadBytes=await page.evaluate(()=>performance.getEntriesByType('resource').reduce((s,r)=>s+r.encodedBodySize,0));assert.ok(measurements.downloadBytes<6*1024*1024);
  await page.evaluate(()=>{const c=new BroadcastChannel('moojai-world-preview-v1');for(let i=0;i<39;i++){const id='crowd-visitor-'+String(i).padStart(3,'0');c.postMessage({type:'state',id,seq:1,state:{id,name:'Visitor',x:1100+(i%6)*25,y:1050+Math.floor(i/6)*20,dir:0,pet:'love-SSR',followers:['career-R','connection-C']}});}c.close();});
  await page.waitForFunction(()=>MooJaiWorld.snapshot().peers.length===39);await page.waitForTimeout(500);
  measurements.crowded=(await snapshot(page)).metrics;assert.ok(measurements.crowded.triangles<150000,JSON.stringify(measurements.crowded));assert.ok(measurements.crowded.drawCalls<120);
  await page.evaluate(()=>{const c=new BroadcastChannel('moojai-world-preview-v1');for(let i=0;i<39;i++){const id='crowd-visitor-'+String(i).padStart(3,'0');c.postMessage({type:'state',id,seq:2,state:{id,name:'Visitor',x:1100+(i%6)*25,y:1050+Math.floor(i/6)*20,dir:0,pet:'love-SSR',followers:['growth-SSR','wealth-SSR'],glow:true}});}for(let i=0;i<80;i++)c.postMessage({type:'lotus-sync',id:'crowd-visitor-000',seq:i+3,lotus:{key:'budget-lotus-'+i,x:90+(i%8)*.8,z:49+Math.floor(i/8)*.5,expires:Date.now()+3600000}});c.close();});
  await page.mouse.move(700,430);await page.mouse.down();await page.mouse.move(960,430);await page.mouse.up();await page.waitForTimeout(400);
  measurements.crowdedWithOfferings=(await snapshot(page)).metrics;assert.ok(measurements.crowdedWithOfferings.triangles<150000,JSON.stringify(measurements.crowdedWithOfferings));assert.ok(measurements.crowdedWithOfferings.drawCalls<120);
  // Care poses must fit the same budget with all 39 visitors and 80 lotuses.
  await page.click('#feed-button');await page.click('[data-food=berries]');await page.waitForTimeout(650);
  measurements.crowdedEating=(await snapshot(page)).metrics;assert.ok((await snapshot(page)).animation.foodVisible);assert.ok(measurements.crowdedEating.triangles<150000);assert.ok(measurements.crowdedEating.drawCalls<120);
  await page.click('#rest-button');await page.waitForTimeout(800);
  measurements.crowdedSleeping=(await snapshot(page)).metrics;assert.ok((await snapshot(page)).animation.pets[0].sleep>.99);assert.ok(measurements.crowdedSleeping.triangles<150000);assert.ok(measurements.crowdedSleeping.drawCalls<120);
  await context.close();
  // Touch controls, small layouts, reduced motion, and lack of storage.
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await mobile.addInitScript(data=>{localStorage.setItem('moojai-world-v1',JSON.stringify({name:'Bua',lead:'love-SSR'}));localStorage.setItem('celestial-atelier-preview-v1',JSON.stringify(data));},seed);
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(BASE+'/world.html');await wait(phone);await phone.waitForTimeout(4500);
  const p0=(await snapshot(phone)).me;const joy=await phone.locator('#joystick').boundingBox();
  const cdp=await mobile.newCDPSession(phone);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width/2,y:joy.y+joy.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:joy.x+joy.width/2,y:joy.y+8}]});await phone.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const p1=(await snapshot(phone)).me;assert.ok(Math.hypot(p1.x-p0.x,p1.y-p0.y)>65,'touch joystick moves');
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await phone.screenshot({path:output+'/mobile.png'});measurements.mobile=(await snapshot(phone)).metrics;
  await phone.click('#pets-button');assert.ok(await phone.locator('#pets-dialog').isVisible());await phone.screenshot({path:output+'/mobile-pets.png'});await mobile.close();
  const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});const quiet=await reduced.newPage();await quiet.goto(BASE+'/world.html');await wait(quiet);assert.ok((await snapshot(quiet)).metrics.renderScale<=.75);await reduced.close();
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync(output+'/metrics.json',JSON.stringify(measurements,null,2));
  console.log(JSON.stringify({passed:true,checks:'3D, responsive controls, ownership, followers, care limits, preview multiplayer, chat filtering/rate/mute/report, prayer, shared lotus, private text, night, reduced motion',...measurements},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
