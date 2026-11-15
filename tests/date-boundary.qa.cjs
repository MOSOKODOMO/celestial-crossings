const {launch}=require('./qa-browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await launch();
  const page=await browser.newPage({timezoneId:'Australia/Sydney'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const NativeDate=Date;let now=NativeDate.parse('2026-11-04T12:59:00Z');
    globalThis.__setTestNow=value=>{now=NativeDate.parse(value);};
    globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
  });
  try{
    await page.goto('http://127.0.0.1:4173');
    await page.locator('#sample-reading').click();
    const field=page.locator('[name=readingDate]');
    assert.equal(await field.isVisible(),false);
    await page.locator('[name=readingMode][value=day]').check();
    assert.equal(await field.inputValue(),'2026-11-04');
    assert.equal(await field.getAttribute('min'),'2026-11-04');
    assert.equal(await page.locator('[name=birthDate]').inputValue(),'1995-06-12');
    const previous=await page.locator('#reading-result').textContent();
    await field.fill('2026-11-03');
    assert.equal(await field.evaluate(input=>input.validity.rangeUnderflow),true);
    assert.match(await field.evaluate(input=>input.validationMessage),/วันนี้/);
    await page.locator('#read-button').click();assert.equal(await page.locator('#reading-result').textContent(),previous);
    await page.locator('[data-language=en]').click();
    assert.match(await field.evaluate(input=>input.validationMessage),/today or a future date/);
    const engineError=await page.evaluate(()=>{
      try{FortuneEngine.read(FortuneLibrary,{birthDate:'1995-06-12',birthTime:'08:30',timeMode:'exact',readingDate:'2026-11-03'});return null;}catch(error){return error.message;}
    });assert.equal(engineError,'PAST_READING_DATE');
    for(const date of ['2026-11-04','2026-11-05','2027-01-01']){
      await field.fill(date);assert.equal(await field.evaluate(input=>input.checkValidity()),true);
      await page.locator('#read-button').click();assert.equal(await page.locator('#form-error').isVisible(),false);
    }
    await field.fill('2026-11-04');
    await page.evaluate(()=>{globalThis.__setTestNow('2026-11-04T13:01:00Z');window.dispatchEvent(new Event('focus'));});
    assert.equal(await field.getAttribute('min'),'2026-11-05');
    assert.equal(await field.evaluate(input=>input.checkValidity()),false);
    assert.equal(await page.evaluate(()=>FortuneEngine.todayISO()),'2026-11-05');
    await field.fill('2026-11-05');assert.equal(await field.evaluate(input=>input.checkValidity()),true);
    await page.locator('#read-button').click();assert.equal(await page.locator('#form-error').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('Passed: local today default, calendar minimum, manually typed past dates, bilingual validation, engine guard, today/future acceptance and Sydney midnight rollover.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
