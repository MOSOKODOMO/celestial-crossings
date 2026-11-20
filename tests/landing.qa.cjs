const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launch,navigate,fillBirthday,BASE}=require('./qa-browser.cjs');
(async()=>{
  const browser=await launch();
  const out=path.resolve(__dirname,'../.local/qa');fs.mkdirSync(out,{recursive:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[],external=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{if(!['blob:','data:'].some(p=>req.url().startsWith(p))&&new URL(req.url()).origin!==new URL(BASE).origin)external.push(req.url());});
  page.on('response',res=>{if(res.status()>=400)failed.push(res.url()+': '+res.status());});
  try{
    await page.goto(BASE+'/reading.html');
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('[name=birthDate]').inputValue(),'');
    assert.equal(await page.locator('[name=timeMode]').inputValue(),'unknown');
    assert.equal(await page.locator('#results').isVisible(),false);
    assert.ok(await page.locator('#birth-form').isVisible());
    assert.ok(await page.evaluate(()=>document.fonts.check('600 16px "Noto Sans Thai"')));
    await page.screenshot({path:path.join(out,'published-desktop.png'),fullPage:true});
    await page.locator('#start').scrollIntoViewIfNeeded();
    // Capture the approved form without a browser-specific scroll animation in flight.
    await page.locator('#start').screenshot({path:path.join(out,'published-desktop-form.png'),animations:'disabled'});
    await page.locator('#read-button').click();
    assert.equal(await page.locator('[name=birthDay]').evaluate(el=>el.validity.valueMissing),true);
    assert.equal(await page.locator('#results').isVisible(),false);
    await fillBirthday(page,'1995-06-12');
    await page.locator('#read-button').click();
    assert.equal(await page.locator('#results').isVisible(),true);
    const ids=await page.locator('#reading-result .record-id').allTextContents();
    await page.locator('[data-language=en]').click();
    assert.deepEqual(await page.locator('#reading-result .record-id').allTextContents(),ids);
    await page.locator('#privacy-button').click();
    assert.equal(await page.locator('#privacy-dialog').isVisible(),true);
    assert.match(await page.locator('#privacy-dialog').textContent(),/GitHub Pages/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#privacy-dialog').isVisible(),false);
    await page.reload();
    assert.equal(await page.locator('[name=birthDate]').inputValue(),'');
    assert.equal(await page.locator('#results').isVisible(),false);
    assert.deepEqual(await page.evaluate(()=>({local:Object.keys(localStorage),session:sessionStorage.length,cookie:document.cookie})),{local:['moojai-language-v1'],session:0,cookie:''});
    for(const width of [1440,1024,768,650,430,390,375,320]){
      await page.setViewportSize({width,height:1000});
      for(const language of ['th','en']){
        await page.locator(`[data-language=${language}]`).click();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Landing overflow: ${width} ${language}`);
        if(width<=650){
          await navigate(page,'library');assert.equal(await page.locator('#library-page').isVisible(),true);
          assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
          await navigate(page,'reading');
          await page.locator('.menu-toggle').click();await page.keyboard.press('Escape');
          assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
        }
      }
    }
    await page.setViewportSize({width:390,height:1000});
    await page.locator('[data-language=th]').click();
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,'published-phone.png')});
    await page.locator('#sample-reading').click();
    assert.equal(await page.locator('#example-notice').isVisible(),true);
    assert.equal(await page.locator('[name=timeMode]').inputValue(),'exact');
    assert.equal(await page.locator('[name=birthTime]').inputValue(),'08:30');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failed,[]);
    console.log('Passed: empty first visit, explicit sample, private data reset, self-hosted art/font, mobile menu, privacy dialog, 16 landing layouts and deployed asset loading.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
