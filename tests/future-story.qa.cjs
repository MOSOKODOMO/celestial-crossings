const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {fillBirthday,BASE}=require('./qa-browser.cjs');

module.exports=async function checkBirthdayAndFutureStory(page,out){
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(BASE+'/reading.html');
  await page.locator('[data-language=en]').click();
  await page.locator('#read-button').click();
  assert.equal(await page.locator('#results').isVisible(),false);
  assert.equal(await page.locator('[name=birthDay]').evaluate(el=>el===document.activeElement),true);

  await fillBirthday(page,'1995-04-31');
  assert.match(await page.locator('#birth-date-error').textContent(),/valid/);
  await page.locator('#read-button').click();
  assert.equal(await page.locator('#results').isVisible(),false);
  await fillBirthday(page,'1900-02-29');
  assert.equal(await page.locator('[name=birthYear]').evaluate(el=>el.checkValidity()),false);
  await fillBirthday(page,'2000-02-29');
  assert.equal(await page.locator('[name=birthYear]').evaluate(el=>el.checkValidity()),true);
  await page.locator('[name=birthEra]').selectOption('be');
  assert.equal(await page.locator('[name=birthYear]').inputValue(),'2543');
  assert.equal(await page.locator('[name=birthDate]').inputValue(),'2000-02-29');
  await page.locator('[data-language=th]').click();
  assert.equal(await page.locator('[name=birthYear]').inputValue(),'2543');
  assert.match(await page.locator('#birth-year-label').textContent(),/พ.ศ./);
  await page.locator('[name=birthEra]').selectOption('ce');
  assert.equal(await page.locator('[name=birthYear]').inputValue(),'2000');

  await fillBirthday(page,'2027-01-01');
  assert.match(await page.locator('#birth-date-error').textContent(),/อนาคต/);
  await page.locator('[data-language=en]').click();
  assert.match(await page.locator('#birth-date-error').textContent(),/future/);
  await fillBirthday(page,'2538-06-12');
  await page.locator('[name=birthEra]').selectOption('be');
  assert.equal(await page.locator('[name=birthDate]').inputValue(),'1995-06-12','Selecting BE can correct a year entered in the wrong era');
  await page.locator('#read-button').click();
  assert.equal(await page.locator('.future-timeline li').count(),4);
  assert.match(await page.locator('.future-story').textContent(),/million.baht|million baht/);
  assert.match(await page.locator('.future-note').textContent(),/not predictions/);
  const storyIds=()=>page.locator('.future-timeline li').evaluateAll(nodes=>nodes.map(n=>n.dataset.storyId));
  const ids=await storyIds(),ages=await page.locator('.future-age').allTextContents();
  await page.locator('[data-week=next]').click();await page.locator('#read-button').click();
  assert.deepEqual(await storyIds(),ids);assert.deepEqual(await page.locator('.future-age').allTextContents(),ages);
  await page.locator('[data-language=th]').click();
  assert.deepEqual(await storyIds(),ids);assert.match(await page.locator('.future-story h2').textContent(),/ชีวิต/);
  await page.locator('[name=birthDay]').fill('13');
  assert.ok(await page.locator('#reading-status').evaluate(el=>el.classList.contains('is-stale')));
  await page.locator('[name=birthDay]').fill('12');

  for(const language of ['en','th']){
    await page.locator(`[data-language=${language}]`).click();
    const downloadEvent=page.waitForEvent('download');await page.locator('#save-reading').click();
    const text=fs.readFileSync(await (await downloadEvent).path(),'utf8');
    assert.ok(text.includes(await page.locator('.future-story h2').textContent()));
    assert.ok(text.includes(await page.locator('.future-note').textContent()));
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${language} ${width} overflow`);
      for(const name of ['birthDay','birthMonth','birthYear']){
        const box=await page.locator(`[name=${name}]`).boundingBox();assert.ok(box.width>=48&&box.height>=44);
      }
      if(width===1440||width===390){
        await page.locator('#start').screenshot({path:path.join(out,`birthday-${language}-${width}.png`)});
        await page.locator('.future-story').screenshot({path:path.join(out,`future-story-${language}-${width}.png`)});
      }
    }
  }
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.future-note').isVisible(),true);
  assert.equal(await page.locator('.future-timeline li').count(),4);
  await page.emulateMedia({media:'screen'});
  await page.reload();
  assert.equal(await page.locator('[name=birthDate]').inputValue(),'');
  assert.equal(await page.locator('#results').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('Passed: direct birthday entry, leap dates, CE/BE round trip, future-date errors, stable bilingual future chapters, downloads, print, and eight responsive layouts.');
};
