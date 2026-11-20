const assert=require('node:assert/strict');
const fs=require('node:fs');
const {launch,BASE}=require('./qa-browser.cjs');
const W=require('../dist/world-core.js');
const cards=['love-C','career-R','wealth-C','wellbeing-C','connection-C','growth-C'];
const snapshot=p=>p.evaluate(()=>MooJaiWorld.snapshot());
// Observe transient poses inside the page. Browser automation round trips on a
// software GPU can otherwise consume the entire four-second eating animation.
async function observeFeeding(page,kind,reduced=false){
  return page.evaluate(({kind,reduced})=>new Promise((resolve,reject)=>{
    const button=document.querySelector(`[data-food=${kind}]`);
    if(!button||button.disabled){reject(new Error('Food choice is not ready'));return;}
    let first=null,firstAt=0;const started=performance.now();
    button.click();
    function sample(now){
      const current=JSON.parse(JSON.stringify(MooJaiWorld.snapshot()));
      if(!first&&current.animation.foodVisible&&current.animation.pets[0].eat>.9){first=current;firstAt=now;}
      else if(first&&now-firstAt>=300&&current.animation.foodVisible&&
        (reduced||Math.abs(current.animation.pets[0].pawY-first.animation.pets[0].pawY)>.02)){
        resolve([first,current]);return;
      }
      if(now-started>8000){reject(new Error('Expected eating poses were not rendered within eight seconds'));return;}
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }),{kind,reduced});
}
(async()=>{
  const browser=await launch(),errors=[];
  async function setup(options={}){
    const context=await browser.newContext({viewport:{width:1440,height:900},...options});
    await context.addInitScript(({cards,ledger})=>{
      localStorage.setItem('moojai-world-v1',JSON.stringify({name:'Mali',language:'en',lead:'love-C',followers:['career-R','wellbeing-C']}));
      localStorage.setItem('celestial-atelier-preview-v1',JSON.stringify({history:cards.map(cardId=>({cardId}))}));
      localStorage.setItem('moojai-world-needs-v1',JSON.stringify({version:1,pets:Object.fromEntries(cards.map(id=>[id,{hunger:80,energy:10}]))}));
      localStorage.setItem('moojai-world-ledger-v1',JSON.stringify(ledger));
    },{cards,ledger:{...W.freshLedger(),lastVisit:W.dateKey(),careDay:W.dateKey(),careCount:5}});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(BASE+'/world.html');await page.waitForFunction(()=>window.MooJaiWorld?.snapshot().joined);return {context,page};
  }
  try{
    fs.mkdirSync('output/world',{recursive:true});
    const {context,page}=await setup();
    for(const [i,card] of cards.entries()){
      if(i){await page.reload();await page.waitForFunction(()=>window.MooJaiWorld?.snapshot().joined);}
      await page.click('#pets-button');await page.click(`[data-card="${card}"] [data-role=lead]`);await page.locator('#pets-dialog [data-close]').click();
      await page.click('#feed-button');const [first,second]=await observeFeeding(page,i%2?'meal':'berries');
      assert.equal(await page.locator('#feeding-dialog').evaluate(d=>d.open),false);
      assert.ok(first.animation.foodVisible);assert.equal(first.animation.foodKind,i%2?'meal':'berries');assert.ok(first.animation.pets[0].eat>.9);
      assert.equal(first.animation.pets.filter(p=>p.visible).length,1,'only the pet being fed eats');
      assert.ok(second.animation.foodPortion<first.animation.foodPortion,'food disappears as bites are eaten');
      assert.ok(Math.abs(second.animation.pets[0].pawY-first.animation.pets[0].pawY)>.02,'paws lift food to the mouth');
      await page.screenshot({path:`output/world/eating-${W.parseCard(card).species}.png`});
      await page.click('#rest-button');await page.waitForFunction(()=>MooJaiWorld.snapshot().animation.pets[0].sleep>.99);const asleep=await snapshot(page);
      assert.ok(!asleep.animation.foodVisible,'rest clears the food bowl');
      assert.ok(asleep.animation.pets[0].sleep>.99);assert.ok(asleep.animation.pets[0].bodyTilt>1.5,'body lies horizontally');
      assert.ok(asleep.animation.pets[0].headY<.7);assert.ok(asleep.animation.pets[0].eyes<.1,'eyes close');
      assert.ok(asleep.animation.pets[0].minY>-.08,`${card}: sleeping geometry stays above the ground (${asleep.animation.pets[0].minY})`);
      assert.ok(asleep.animation.sleepMarks>=3);assert.equal(asleep.animation.pets.filter(p=>p.visible).length,1+asleep.me.followers.length);
      await page.screenshot({path:`output/world/sleeping-${W.parseCard(card).species}.png`});
      assert.ok(asleep.metrics.drawCalls<120&&asleep.metrics.triangles<150000);
      await page.keyboard.down('KeyW');await page.waitForFunction(()=>{const s=MooJaiWorld.snapshot();return !s.resting&&!s.animation.pets[0].visible;});await page.keyboard.up('KeyW');
      const awake=await snapshot(page);assert.equal(awake.resting,false);assert.equal(awake.animation.pets[0].visible,false,'moving returns to the upright walking model');
    }
    // Finishing a meal clears its props; moving can interrupt it immediately.
    await page.click('#feed-button');await page.click('[data-food=berries]');await page.waitForTimeout(4300);
    assert.ok(!(await snapshot(page)).animation.foodVisible);
    await page.click('#feed-button');await page.click('[data-food=berries]');await page.keyboard.down('KeyD');await page.waitForTimeout(850);await page.keyboard.up('KeyD');
    assert.ok(!(await snapshot(page)).animation.foodVisible);await context.close();
    const mobile=await setup({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await mobile.page.click('#feed-button');const [mobileEating]=await observeFeeding(mobile.page,'berries');
    await mobile.page.screenshot({path:'output/world/mobile-eating.png'});
    assert.ok(mobileEating.animation.foodVisible);
    await mobile.page.click('#rest-button');await mobile.page.waitForTimeout(900);await mobile.page.screenshot({path:'output/world/mobile-sleeping.png'});await mobile.context.close();
    const quiet=await setup({reducedMotion:'reduce'});
    await quiet.page.click('#feed-button');const [still,later]=await observeFeeding(quiet.page,'meal',true);
    assert.equal(still.animation.pets[0].pawY,later.animation.pets[0].pawY);assert.equal(still.animation.foodPortion,later.animation.foodPortion);
    await quiet.page.click('#rest-button');await quiet.page.waitForTimeout(100);const resting=await snapshot(quiet.page);await quiet.page.waitForTimeout(300);
    assert.equal(resting.animation.pets[0].headY,(await snapshot(quiet.page)).animation.pets[0].headY);
    assert.equal(resting.animation.sleepMarks,3,'one static sleep mark per companion');await quiet.context.close();
    assert.deepEqual(errors,[]);
    console.log('Pet animation QA passed: all six species, visible eating/paws/food, sleeping/closed eyes/followers, wake and interrupt, cleanup, mobile and reduced motion.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
