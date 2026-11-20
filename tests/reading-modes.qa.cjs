const fs=require('node:fs');
const path=require('node:path');
const {launch}=require('./qa-browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await launch();
  const page=await browser.newPage({viewport:{width:1280,height:1000},timezoneId:'Australia/Sydney'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const NativeDate=Date;let now=NativeDate.parse('2026-11-04T01:00:00Z');
    globalThis.__setTestNow=value=>{now=NativeDate.parse(value);};
    globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
  });
  try{
    await page.goto('http://127.0.0.1:4173/reading.html');
    await page.locator('#sample-reading').click();
    const field=page.locator('[name=readingDate]'),mode=value=>page.locator(`[name=readingMode][value=${value}]`),ids=()=>page.locator('#reading-result .record-id').allTextContents();
    assert.equal(await mode('week').isChecked(),true);
    assert.equal(await page.locator('#day-context').isVisible(),false);
    assert.equal(await field.isVisible(),false);assert.equal(await field.isDisabled(),true);
    assert.match(await page.locator('#reading-status').textContent(),/4.*8/);
    const beforeLocked=await ids(),locked=page.locator('#custom-week-locked'),dialog=page.locator('#custom-week-dialog');
    for(const language of ['th','en']){
      await page.locator(`[data-language=${language}]`).click();
      await locked.click();assert.equal(await dialog.isVisible(),true);
      assert.match(await page.locator('#payment-unavailable').textContent(),language==='th'?/ยังไม่เปิดให้ชำระเงิน/:/not available in this demo/);
      await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
      assert.equal(await locked.evaluate(el=>document.activeElement===el),true);assert.deepEqual(await ids(),beforeLocked);
      for(const width of [390,320]){
        await page.setViewportSize({width,height:850});await locked.click();
        assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        if(language==='th'&&width===390)await page.screenshot({path:path.resolve(__dirname,'../.local/qa/locked-week-th-mobile.png')});
        await page.locator('#close-custom-week').click();assert.equal(await dialog.isVisible(),false);
      }
    }
    await page.setViewportSize({width:1280,height:1000});await page.locator('[data-language=th]').click();
    await page.locator('[data-week=next]').click();assert.match(await page.locator('#week-period-confirm').textContent(),/9.*15/);
    await page.locator('#read-button').click();assert.match(await page.locator('#reading-status').textContent(),/9.*15/);
    const weeklyIds=await ids(),core=await page.locator('.card-number').textContent();
    await page.locator('#read-button').click();assert.deepEqual(await ids(),weeklyIds);
    await mode('day').check();
    assert.equal(await field.isVisible(),true);assert.equal(await field.isDisabled(),false);
    await field.fill('2027-02-01');await page.locator('#read-button').click();assert.equal(await page.locator('#form-error').isVisible(),false);
    await mode('week').check();await page.locator('#read-button').click();
    assert.equal(await field.isVisible(),false);assert.deepEqual(await ids(),weeklyIds);
    assert.equal(await page.locator('[data-week=next]').getAttribute('aria-pressed'),'true');
    await mode('day').check();assert.equal(await field.inputValue(),'2027-02-01');
    await field.fill('2026-11-11');
    assert.equal(await page.locator('#week-shortcuts').isVisible(),false);
    assert.equal(await page.locator('#day-context').isVisible(),true);
    await page.locator('[name=occasion]').selectOption('interview');await page.locator('[name=support]').selectOption('confidence');
    await page.locator('#read-button').click();
    assert.equal(await page.locator('.card-number').textContent(),core);
    assert.notDeepEqual(await ids(),weeklyIds);
    assert.match(await page.locator('#reading-status').textContent(),/11/);
    assert.match(await page.locator('#guidance-title').textContent(),/สัมภาษณ์/);
    assert.match(await page.locator('.guidance-panel').textContent(),/ตื่นเต้น/);
    const dailyIds=await ids();await page.locator('#read-button').click();assert.deepEqual(await ids(),dailyIds);
    await page.locator('[name=support]').selectOption('preparation');await page.locator('#read-button').click();
    assert.deepEqual(await ids(),dailyIds);assert.match(await page.locator('.guidance-panel').textContent(),/สองตัวอย่าง/);
    await page.locator('[name=occasion]').selectOption('date');await page.locator('[name=support]').selectOption('communication');await page.locator('#read-button').click();
    assert.deepEqual(await ids(),dailyIds);assert.match(await page.locator('#guidance-title').textContent(),/นัดเดต/);
    assert.match(await page.locator('.guidance-panel').textContent(),/ไม่สบายใจ/);
    await page.locator('[data-language=en]').click();
    assert.equal(await page.locator('[name=occasion]').inputValue(),'date');assert.equal(await page.locator('[name=support]').inputValue(),'communication');
    assert.deepEqual(await ids(),dailyIds);assert.match(await page.locator('.guidance-panel').textContent(),/uncomfortable/);
    for(const occasion of ['general','interview','date'])for(const support of ['balanced','preparation','confidence','communication']){
      await page.locator('[name=occasion]').selectOption(occasion);await page.locator('[name=support]').selectOption(support);await page.locator('#read-button').click();
      assert.equal(await page.locator('#form-error').isVisible(),false);assert.equal(await page.locator('.guidance-panel dd').count(),3);
      assert.ok(!(await page.locator('.guidance-panel').textContent()).includes('undefined'));
    }
    await field.fill('2026-11-12');await page.locator('#read-button').click();assert.notDeepEqual(await ids(),dailyIds);
    const pastResult=await page.locator('#reading-result').textContent();await field.fill('2026-11-03');await page.locator('#read-button').click();
    assert.equal(await field.evaluate(el=>el.checkValidity()),false);assert.equal(await page.locator('#reading-result').textContent(),pastResult);
    await field.fill('2026-11-11');await page.locator('[name=occasion]').selectOption('interview');await page.locator('[name=support]').selectOption('confidence');await page.locator('#read-button').click();
    const downloadPromise=page.waitForEvent('download');await page.locator('#save-reading').click();const download=await downloadPromise;
    assert.match(download.suggestedFilename(),/^fortune-day-2026-11-11-/);
    const exported=fs.readFileSync(await download.path(),'utf8');assert.match(exported,/Reading for 11 Nov 2026/);assert.match(exported,/Job interview/);assert.match(exported,/If nerves make you rush/);assert.match(exported,/12 Jun 1995 · Monday · 08:00–11:59 · Exact clock time/);assert.doesNotMatch(exported,/No birth time is invented/);
    await page.emulateMedia({media:'print'});assert.equal(await page.locator('.result-period').isVisible(),true);assert.match(await page.locator('.result-period').textContent(),/11 Nov 2026/);await page.emulateMedia({media:'screen'});
    const out=path.resolve(__dirname,'../.local/qa');fs.mkdirSync(out,{recursive:true});
    for(const language of ['th','en']){
      await page.locator(`[data-language=${language}]`).click();
      for(const width of [1280,768,390,320]){
        await page.setViewportSize({width,height:1000});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${language} daily overflow at ${width}`);
        if(language==='th'&&[1280,390].includes(width)){
          await page.locator('.reading-cover').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
          await page.screenshot({path:path.join(out,`day-interview-th-${width}.png`),fullPage:true});
        }
      }
    }
    await mode('week').check();await page.locator('[data-week=this]').click();await page.locator('#read-button').click();
    assert.match(await page.locator('#reading-status').textContent(),/4.*8/);assert.equal(await field.isDisabled(),true);assert.equal(await page.locator('[name=occasion]').isDisabled(),true);
    for(const [now,next] of [['2026-11-08T01:00:00Z','2026-11-09'],['2026-11-09T01:00:00Z','2026-11-16'],['2026-12-31T01:00:00Z','2027-01-04'],['2028-02-29T01:00:00Z','2028-03-06']]){
      await page.evaluate(value=>{__setTestNow(value);window.dispatchEvent(new Event('focus'));},now);
      await page.locator('[data-week=next]').click();await page.locator('#read-button').click();assert.equal(await page.locator('#form-error').isVisible(),false);
      const expected=await page.evaluate(value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',calendar:'gregory',timeZone:'UTC'}).format(FortuneEngine.parseDate(value)),next);
      assert.ok((await page.locator('#reading-status').textContent()).includes(expected));
    }
    assert.deepEqual(errors,[]);
    console.log('Passed: date picker only in daily mode, independent day/week selections, locked paid-week modal and keyboard dismissal, current/future periods, next-week boundaries, 12 advice choices, stable cards, past-date rejection, Thai/English, text/print export and responsive layouts.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
