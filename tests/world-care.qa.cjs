const assert=require('node:assert/strict');
const fs=require('node:fs');
const {launch,BASE}=require('./qa-browser.cjs');
const W=require('../dist/world-core.js');
const snapshot=p=>p.evaluate(()=>MooJaiWorld.snapshot());
const wait=p=>p.waitForFunction(()=>window.MooJaiWorld?.snapshot().ready&&MooJaiWorld.snapshot().joined);
const need=(s,id='love-C')=>s.needs.pets[id];
(async()=>{
  const browser=await launch(),errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    // Seed before application startup, once per test context. Writing after a
    // first navigation races the old document's pagehide save on reload.
    await context.addInitScript(({ledger})=>{
      if(localStorage.getItem('world-care-qa-seeded'))return;
      localStorage.setItem('world-care-qa-seeded','true');
      localStorage.setItem('moojai-world-v1',JSON.stringify({name:'Mali',language:'en',lead:'love-C',followers:['career-R']}));
      localStorage.setItem('celestial-atelier-preview-v1',JSON.stringify({history:[{cardId:'love-C'},{cardId:'career-R'}]}));
      localStorage.setItem('moojai-world-needs-v1',JSON.stringify({version:1,pets:{'love-C':{hunger:65,energy:38},'career-R':{hunger:45,energy:60}}}));
      localStorage.setItem('moojai-world-ledger-v1',JSON.stringify(ledger));
    },{ledger:{...W.freshLedger(),careDay:W.dateKey(),careCount:4}});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(BASE+'/world.html');await wait(page);
    assert.ok(await page.locator('#companion-status').isVisible());
    const before=await snapshot(page),fedAt=Date.now();
    await page.click('#feed-button');await page.click('[data-food=berries]');
    assert.equal(await page.locator('#feeding-dialog').evaluate(d=>d.open),false,'food choice returns to the visible eating animation');
    await page.waitForFunction(()=>MooJaiWorld.snapshot().ledger.careCount===5);
    const berry=await snapshot(page);
    // Berries remove 20 hunger; hunger keeps rising slowly in real time (max 2/min), so allow that drift on slow machines.
    const drift=need(berry).hunger-(need(before).hunger-20),minutes=(Date.now()-fedAt)/60000;
    assert.ok(drift>-.2&&drift<minutes*2+.2,`berries remove 20 hunger (drift ${drift.toFixed(2)})`);
    assert.equal(need(berry).energy,43);
    assert.equal(need(berry,'career-R').energy,60,'feeding only affects the selected pet');
    // While the 4 s chewing cooldown runs, food is disabled (checked atomically so slow machines can't race it).
    const chew=await page.evaluate(()=>{const s=MooJaiWorld.snapshot(),p=s.needs.pets[s.me.pet];return {disabled:document.querySelector('[data-food=meal]').disabled,chewing:Date.now()<p.feedReadyAt-300};});
    assert.ok(!chew.chewing||chew.disabled,'food is disabled while the pet is chewing');
    const readyAt=need(berry).feedReadyAt;
    await page.reload();await wait(page);await page.click('#feed-button');
    assert.equal(need(await snapshot(page)).feedReadyAt,readyAt,'cooldown survives reload');
    await page.waitForFunction(()=>!document.querySelector('[data-food=meal]').disabled);
    await page.click('[data-food=meal]');await page.waitForTimeout(120);
    const meal=await snapshot(page);
    assert.ok(need(meal).hunger<1);assert.equal(need(meal).energy,55);
    assert.equal(meal.ledger.careCount,5,'nutrition still works after daily reward cap');
    fs.mkdirSync('output/world',{recursive:true});await page.waitForTimeout(400);await page.screenshot({path:'output/world/desktop-feeding.png'});
    await page.click('#rest-button');
    // Software-rendered CI can deliver fewer frames within a wall-clock delay.
    // Wait for the actual recovery while keeping the original energy assertions.
    await page.waitForFunction(()=>{const s=MooJaiWorld.snapshot();return s.resting&&s.needs.pets['love-C'].energy>57&&s.needs.pets['career-R'].energy>62;},null,{timeout:10000});
    const rested=await snapshot(page);assert.ok(rested.resting);assert.ok(need(rested).energy>57);assert.ok(need(rested,'career-R').energy>62);
    // Measure from when walking has actually started (resting restores energy until then).
    await page.keyboard.down('KeyW');await page.waitForFunction(()=>MooJaiWorld.snapshot().me.moving&&!MooJaiWorld.snapshot().resting);
    const startWalk=await snapshot(page);await page.waitForTimeout(1100);
    const walked=await snapshot(page);await page.keyboard.up('KeyW');assert.equal(walked.resting,false);assert.ok(need(walked).energy<need(startWalk).energy,'walking uses energy');
    assert.ok(need(walked).hunger>need(startWalk).hunger,'walking makes the pet hungrier');
    // Tab visibility is a browser lifecycle input, not a game mutation hook.
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const paused=await snapshot(page);await page.waitForTimeout(600);assert.deepEqual((await snapshot(page)).needs,paused.needs);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.reload();await wait(page);
    assert.ok(Math.abs(need(await snapshot(page)).energy-need(paused).energy)<.1);
    await page.click('#pets-button');await page.click('[data-card="career-R"] [data-role=lead]');
    assert.equal((await snapshot(page)).me.pet,'career-R');
    assert.match(await page.locator('#active-pet-name').innerText(),/Tiger/);
    assert.ok(need(await snapshot(page),'career-R').hunger>40,'switching pets retains separate hunger');
    await page.locator('#pets-dialog [data-close]').click();await page.click('#language');
    // Hunger is stored internally but shown as Fullness (100% = full), like Energy.
    const compact=await page.locator('#compact-needs').innerText(),shownFull=Number((compact.match(/อิ่มท้อง\s*(\d+)%/)||[])[1]);
    assert.ok(Number.isFinite(shownFull),'Fullness meter is shown in Thai');
    assert.ok(Math.abs(shownFull-(100-need(await snapshot(page),'career-R').hunger))<=1.5,'Fullness = 100 - hunger');
    await page.click('#feed-button');assert.match(await page.locator('[data-food=berries]').innerText(),/เบอร์รี/);
    await page.locator('#feeding-dialog .primary').click();
    await page.setViewportSize({width:390,height:844});await page.click('#feed-button');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const box=await page.locator('#feeding-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);
    await page.waitForTimeout(400);await page.screenshot({path:'output/world/mobile-feeding.png'});
    await page.locator('#feeding-dialog .primary').click();
    await page.setViewportSize({width:360,height:740});
    const hud=await page.locator('#companion-status').boundingBox(),joy=await page.locator('#joystick').boundingBox();
    assert.ok(hud.x>=joy.x+joy.width,'gauges leave the movement control clear');
    assert.deepEqual(errors,[]);await context.close();
    console.log('World care passed: food effects, cooldown/reload, daily reward cap, rest, movement drain, per-pet saves, hidden-tab pause, Thai/English and mobile layout.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
