const fs=require('node:fs');
const path=require('node:path');
const {launch,navigate}=require('./qa-browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const out=path.resolve(__dirname,'../.local/qa');fs.mkdirSync(out,{recursive:true});
  const browser=await launch();
  const page=await browser.newPage({viewport:{width:1280,height:1000},timezoneId:'Australia/Sydney'});
  await page.addInitScript(()=>{
    const NativeDate=Date,fixed=NativeDate.parse('2026-11-04T01:00:00Z');
    globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
  });
  const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:4173')&&!request.url().startsWith('blob:'))external.push(request.url());});
  await page.goto('http://127.0.0.1:4173');
  assert.equal(await page.locator('[name=birthDate]').inputValue(),'');
  assert.equal(await page.locator('[name=timeMode]').inputValue(),'unknown');
  assert.equal(await page.locator('#results').isVisible(),false);
  await page.screenshot({path:path.join(out,'home-th-desktop.png'),fullPage:true});
  await page.locator('#sample-reading').click();
  await page.locator('.reading-cover').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'th');
  assert.match(await page.locator('#birth-date-confirm').textContent(),/1995/);
  assert.match(await page.locator('#reading-date-confirm').textContent(),/2026/);
  const ids=async()=>page.locator('#reading-result .record-id').allTextContents();
  const original=await ids(),core=await page.locator('.card-number').textContent();
  await page.locator('#read-button').click();assert.deepEqual(await ids(),original);
  await page.locator('[name=birthDate]').fill('1995-06-13');await page.locator('#read-button').click();
  assert.equal(await page.locator('.card-number').textContent(),core);
  assert.notDeepEqual(await ids(),original);
  await page.locator('[name=birthDate]').fill('1995-06-12');
  await page.locator('[name=timeMode]').selectOption('unknown');
  assert.equal(await page.locator('[name=birthTime]').isVisible(),false);
  await page.locator('#read-button').click();assert.equal(await page.locator('.nuance-panel p').count(),1);
  const unknownDownload=page.waitForEvent('download');await page.locator('#save-reading').click();
  const unknownText=fs.readFileSync(await (await unknownDownload).path(),'utf8');
  assert.match(unknownText,/ไม่ทราบเวลาเกิด/);assert.match(unknownText,/ไม่เดาเวลาเกิด/);assert.match(unknownText,/1995/);
  await page.locator('[name=timeMode]').selectOption('approximate');await page.locator('[name=timeWindow]').selectOption('3');await page.locator('#read-button').click();assert.equal(await page.locator('.nuance-panel p').count(),2);
  await page.locator('[data-week=next]').click();await page.locator('#read-button').click();assert.notEqual(await page.locator('.card-number').textContent(),core);
  await page.locator('[data-week=this]').click();await page.locator('[name=timeMode]').selectOption('exact');await page.locator('#read-button').click();
  await page.locator('.reading-cover').evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
  await page.screenshot({path:path.join(out,'reading-th-desktop.png'),fullPage:true});
  const beforeLanguage=await ids();await page.locator('[data-language=en]').click();assert.deepEqual(await ids(),beforeLanguage);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await navigate(page,'library');assert.equal(await page.locator('.library-item').count(),52);
  await page.locator('#library-search').fill('C01');assert.equal(await page.locator('.library-item').count(),1);
  await page.locator('.library-item summary').click();assert.equal(await page.locator('.library-item .domain-section').count(),4);
  await page.locator('#library-search').fill('');await page.locator('[data-category=work]').click();assert.equal(await page.locator('.library-item').count(),16);
  await page.locator('#phase-filter').selectOption('opening');assert.equal(await page.locator('.library-item').count(),4);
  await page.locator('[data-category=weekdays]').click();assert.equal(await page.locator('.library-item').count(),7);assert.equal(await page.locator('#phase-filter').isDisabled(),true);
  await page.locator('[data-category=cores]').click();await page.locator('#phase-filter').selectOption('all');
  await page.locator('[data-language=th]').click();await page.locator('#expand-all').click();assert.equal(await page.locator('.library-item[open]').count(),52);
  await page.screenshot({path:path.join(out,'library-th-desktop.png'),fullPage:false});
  const layouts=[];
  for(const language of ['th','en']){
    await page.locator(`[data-language=${language}]`).click();
    for(const width of [1280,768,390,320]){
      await page.setViewportSize({width,height:1000});
      for(const view of ['reading','library','plan']){
        await navigate(page,view);
        const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
        assert.ok(layout.width<=layout.viewport+1,`${language} ${view} overflow at ${width}: ${layout.width}`);
        layouts.push({language,view,...layout});
      }
    }
  }
  await page.locator('[data-language=th]').click();await navigate(page,'reading');
  await page.setViewportSize({width:390,height:1000});
  await page.screenshot({path:path.join(out,'reading-th-mobile.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#read-button').click();
  assert.equal(await page.locator('.reading-cover').evaluate(el=>el.getAnimations().length),0);
  const downloadPromise=page.waitForEvent('download');await page.locator('#save-reading').click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('-th.txt'));
  const catalogue=await browser.newPage();await catalogue.goto('http://127.0.0.1:4173/fortune-library-th-en.html');
  const catalogueCount=await catalogue.locator('article[id]').evaluateAll(articles=>articles.filter(a=>/^C\d{2}$/.test(a.id)).length);assert.equal(catalogueCount,52);
  assert.equal(await catalogue.locator('article#C01 .topics section').count(),4);
  assert.equal(await catalogue.locator('article[id]').count(),116);
  const jsonResponse=await page.request.get('http://127.0.0.1:4173/fortune-library.json');assert.equal(jsonResponse.status(),200);assert.equal((await jsonResponse.json()).cores.length,52);
  const forbidden=await page.request.get('http://127.0.0.1:4173/..%5ccontent%5clibrary.cjs');assert.equal(forbidden.status(),403);
  const post=await page.request.post('http://127.0.0.1:4173/');assert.equal(post.status(),405);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,errors,externalRequests:external,layouts,catalogueCores:52,cataloguePrimaryPassages:116,download:download.suggestedFilename()},null,2));
  console.log(JSON.stringify({passed:true,checks:'Thai/English, DOB/time paths, deterministic readings, search/filter, 24 responsive states, print catalogue, text download, no external requests, server restrictions',screenshots:out},null,2));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
