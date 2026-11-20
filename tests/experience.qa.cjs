const assert=require('node:assert/strict');
const fs=require('node:fs');
const {launch,fillBirthday,BASE}=require('./qa-browser.cjs');

(async()=>{
  const browser=await launch(),errors=[];
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(BASE+'/');
    assert.equal(await page.locator('#card-picks,#birth-form').count(),0,'Home has a clear introduction, with no duplicate workspaces');
    await page.locator('[data-language=en]').click();
    await page.locator('.hero-cta').click();
    await page.waitForURL(/reading.html/);
    assert.equal(await page.locator('html').getAttribute('lang'),'en','Language follows the journey');
    await fillBirthday(page,'1988-03-25');await page.locator('#read-button').click();
    const original=await page.locator('#reading-result .record-id').allTextContents();
    await page.locator('#sample-reading').click();
    assert.equal(await page.locator('[name=birthDate]').inputValue(),'1995-06-12');
    await page.locator('#restore-profile').click();
    assert.equal(await page.locator('[name=birthDate]').inputValue(),'1988-03-25');
    assert.deepEqual(await page.locator('#reading-result .record-id').allTextContents(),original);
    assert.equal(await page.locator('#example-notice').isVisible(),false);
    assert.equal(await page.locator('#include-birth-details').isChecked(),false);
    const download=async()=>{const event=page.waitForEvent('download');await page.locator('#save-reading').click();return fs.readFileSync(await(await event).path(),'utf8');};
    assert.doesNotMatch(await download(),/25 Mar 1988/);
    await page.locator('#include-birth-details').check();assert.match(await download(),/25 Mar 1988/);
    assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),['moojai-language-v1']);
    await page.reload();assert.equal(await page.locator('[name=birthDate]').inputValue(),'');
    // The sample also restores a blank form without inventing a saved reading.
    await page.locator('#sample-reading').click();await page.locator('#restore-profile').click();
    assert.equal(await page.locator('#results').isVisible(),false);
    assert.equal(await page.locator('[name=birthDate]').inputValue(),'');

    await page.goto(BASE+'/charms.html#collection');
    assert.ok(await page.locator('#empty-collection').isVisible());
    await page.locator('#empty-action').click();
    assert.equal(await page.locator('.category-button[aria-pressed=true]').count(),0);
    assert.equal(await page.locator('.card-pick:disabled').count(),3);
    await page.locator('[data-category=love]').click();await page.locator('[data-category=career]').click();
    await page.locator('.card-pick').first().click();
    await page.locator('#keep-card').click();
    await page.waitForFunction(()=>location.hash==='#collection'&&document.activeElement.id==='edition-title');
    assert.ok(await page.locator('#deck').isVisible());assert.equal(await page.locator('#ritual').isVisible(),false);
    assert.equal(await page.locator('.gallery-card').count(),1);
    await page.reload();assert.equal(await page.locator('#collection-count').textContent(),'1');
    await page.goto(BASE+'/#ritual');await page.waitForURL(/charms.html#ritual/);
    assert.equal(await page.locator('#collection-count').textContent(),'1','Legacy links preserve the original collection');

    let layouts=0;
    for(const route of ['/','/reading.html','/charms.html','/charms.html#collection']){
      await page.goto(BASE+route);
      for(const language of ['th','en']){
        await page.locator(`[data-language=${language}]`).click();
        for(const width of [320,390,768,1440]){
          await page.setViewportSize({width,height:900});
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} ${language} overflows at ${width}`);layouts++;
        }
      }
    }
    await page.setViewportSize({width:390,height:844});await page.goto(BASE+'/');
    await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('.menu-toggle').evaluate(el=>el===document.activeElement),true);
    const blocked=await browser.newContext({reducedMotion:'reduce'});
    await blocked.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('Storage unavailable');};});
    const guest=await blocked.newPage();await guest.goto(BASE+'/charms.html');
    await guest.locator('[data-language=en]').click();
    await guest.locator('[data-category=love]').click();await guest.locator('[data-category=career]').click();
    await guest.locator('.card-pick').first().click();
    assert.match(await guest.locator('#saved-note').textContent(),/This session only/);
    assert.match(await guest.locator('#storage-note').textContent(),/only until you reload/);
    await blocked.close();
    assert.deepEqual(errors,[]);
    console.log(`Experience QA passed: ${layouts} bilingual layouts, persistent locale, private/opt-in exports, sample recovery, explicit intentions, reveal-to-collection focus, legacy routes and menu dismissal.`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
