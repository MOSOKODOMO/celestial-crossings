const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { launch, BASE } = require('./qa-browser.cjs');

(async () => {
  const browser = await launch();
  const errors = [];
  const context = await browser.newContext({ viewport: {width:1440,height:1000}, reducedMotion:'reduce' });
  await context.addInitScript(() => {
    const saved = JSON.parse(localStorage.getItem('celestial-atelier-preview-v1') || 'null');
    let cursor = (saved?.total || 0) * 2;
    const rolls = [...Array.from({length:9}, () => [0.4,0.9]).flat(), 0.6, 0.0001, 0.95, 0.9];
    Object.defineProperty(window.crypto, 'getRandomValues', { configurable:true, value(array) {
      array[0] = Math.floor((rolls[cursor++] ?? 0.9) * 4294967296);
      return array;
    } });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`); });
  const output = path.resolve(__dirname,'../.local');
  fs.mkdirSync(output,{recursive:true});
  try {
    await page.goto(`${BASE}/charms.html#deck`);
    await page.locator('[data-language=en]').click();
    await page.locator('.gallery-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.category-button[aria-pressed=true]').count(),0);
    assert.equal(await page.locator('.gallery-card').count(),30);
    await page.locator('#collection-filter').selectOption('career');
    assert.equal(await page.locator('.gallery-card').count(),5);
    await page.locator('#collection-filter').selectOption('all');
    assert.equal(await page.locator('#draw-progress').textContent(),'0 / 10');
    await page.screenshot({path:path.join(output,'collect-desktop.png'),fullPage:true});
    await page.locator('#header-draw').click();
    await page.locator('[data-category=love]').click();
    await page.locator('[data-category=career]').click();
    await page.locator('[data-category=wealth]').click();
    assert.match(await page.locator('#selection-note').textContent(),/Deselect one/);
    await page.locator('[data-category=love]').click();
    assert.equal(await page.locator('.card-pick:disabled').count(),3);
    await page.locator('[data-category=love]').click();
    assert.equal(await page.locator('.card-pick:enabled').count(),3);
    await page.locator('#rules-button').click();
    assert.equal(await page.locator('#info-dialog').isVisible(),true);
    assert.match(await page.locator('#odds-table').textContent(),/0.15%/);
    await page.keyboard.press('Escape');
    for (let draw=1; draw<=9; draw++) {
      const pick = page.locator('.card-pick').nth((draw - 1) % 3);
      if (draw === 1) {
        await pick.focus();
        await page.keyboard.press('Enter');
        await page.locator('.card-pick').last().evaluate(button => button.click());
      } else await pick.click();
      await page.locator('#reveal-dialog').waitFor({state:'visible'});
      assert.equal(await page.locator('#reveal-title').textContent(),'The Seed');
      assert.equal(await page.locator('#collection-count').textContent(),String(draw));
      assert.equal(await page.locator('.category-button:disabled').count(),6);
      await page.locator('#close-reveal').click();
    }
    assert.match(await page.locator('#guarantee-note').textContent(),/next card is guaranteed/);
    await page.locator('#collection-nav').click();
    assert.equal(await page.locator('.gallery-card').count(),1);
    assert.equal(await page.locator('.quantity-tag').textContent(),'×9');
    await page.locator('#collection-filter').selectOption('love');
    assert.equal(await page.locator('#empty-collection').isVisible(),true);
    await page.reload();
    assert.equal(await page.locator('#draw-progress').textContent(),'9 / 10');
    assert.equal(await page.locator('#collection-count').textContent(),'9');
    await page.locator('#header-draw').click();
    await page.getByRole('button',{name:'Right card',exact:true}).click();
    await page.locator('#reveal-dialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#reveal-title').textContent(),'The Eternal Bond');
    assert.match(await page.locator('#reveal-category').textContent(),/Love SSR/);
    assert.match(await page.locator('#preferred-result').textContent(),/10-draw promise/);
    await page.locator('#close-reveal').click();
    // The dialog's close event is dispatched asynchronously; wait for the unlock.
    await page.waitForFunction(()=>document.querySelectorAll('.category-button:disabled').length===0,null,{timeout:5000});
    assert.equal(await page.locator('.category-button:disabled').count(),0);
    await page.locator('[data-category=love]').click();
    await page.locator('[data-category=wellbeing]').click();
    await page.reload();
    assert.equal(await page.locator('#collection-count').textContent(),'10');
    assert.equal(await page.locator('[data-category=wellbeing]').getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'Right card',exact:true}).click();
    await page.locator('#reveal-dialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#reveal-title').textContent(),'The New Leaf');
    assert.equal(await page.locator('#draw-progress').textContent(),'1 / 10');
    await page.keyboard.press('Escape');
    await page.locator('#reset-button').click();
    await page.locator('#cancel-reset').click();
    assert.equal(await page.locator('#collection-count').textContent(),'11');
    await page.locator('#reset-button').click();
    await page.locator('#confirm-reset').click();
    assert.equal(await page.locator('#collection-count').textContent(),'0');
    await page.goto(`${BASE}/charms.html#deck`);
    await page.locator('.gallery-card').first().click();
    assert.match(await page.locator('#saved-note').textContent(),/Not added/);
    assert.equal(await page.locator('#collection-count').textContent(),'0');
    await page.locator('#close-reveal').click();
    for (const width of [1440,1024,768,390,320]) {
      await page.setViewportSize({width,height:844});
      await page.evaluate(() => window.scrollTo(0,0));
      const sizes = await page.evaluate(() => ({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
      if(sizes.scroll>sizes.viewport) console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].map(el => ({tag:el.tagName,class:el.getAttribute('class'),x:el.getBoundingClientRect().x,right:el.getBoundingClientRect().right})).filter(el => el.right>innerWidth || el.x<0).slice(0,25)));
      if(width===390) await page.screenshot({path:path.join(output,'collect-mobile.png'),fullPage:true});
      assert.ok(sizes.scroll<=sizes.viewport,`Horizontal overflow at ${width}: ${JSON.stringify(sizes)}`);
    }
    await page.locator('#header-draw').click();
    await page.locator('[data-category=love]').click();
    await page.locator('[data-category=career]').click();
    await page.getByRole('button',{name:'Right card',exact:true}).click();
    await page.locator('#reveal-dialog').waitFor({state:'visible'});
    const dialog = await page.locator('#reveal-dialog').boundingBox();
    assert.ok(dialog.x>=0 && dialog.x+dialog.width<=320,'Reveal fits mobile width');
    await page.screenshot({path:path.join(output,'collect-mobile-reveal.png')});
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);
    console.log('Collector browser QA passed: selection limits, exact tenth-draw guarantee, independent SSR roll, persistence, preferences between groups, duplicate counts, collection filters, dialogs, reset, and 5 responsive widths.');
    console.log(`Screenshots: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error);process.exitCode=1; });
