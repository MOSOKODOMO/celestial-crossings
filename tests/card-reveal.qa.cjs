const assert = require('node:assert/strict');
const {launch, BASE} = require('./qa-browser.cjs');
const storageKey = 'celestial-atelier-preview-v1';

(async () => {
  const browser = await launch();
  const errors = [];
  const page = await browser.newPage({viewport:{width:390,height:844}, hasTouch:true});
  page.on('pageerror', error => errors.push(error.message));
  const total = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).total, storageKey);
  const completed = () => page.waitForFunction(() => document.querySelector('#reveal-dialog').dataset.phase === 'revealed');
  const settled = () => page.waitForFunction(() => !document.querySelector('#reveal-dialog').open && !document.querySelector('.card-pick').disabled);
  try {
    await page.goto(`${BASE}/charms.html`);
    await page.locator('[data-language=en]').click();
    await page.locator('[data-category=love]').click();
    await page.locator('[data-category=career]').click();

    // A real touch draw commits once, traps focus, and hides result controls until revealed.
    await page.locator('.card-pick').first().tap();
    assert.equal(await total(), 1);
    assert.equal(await page.locator('#skip-reveal').isVisible(), true);
    assert.equal(await page.locator('#keep-card').isVisible(), false);
    await page.locator('.card-pick').last().evaluate(button => button.click());
    assert.equal(await total(), 1, 'Repeated input cannot create a second draw');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#reveal-dialog').evaluate(dialog => dialog.contains(document.activeElement)), true);
    await completed();
    assert.equal(await page.locator('#skip-reveal').isVisible(), false);
    assert.equal(await page.locator('#keep-card').isVisible(), true);
    assert.equal(await page.locator('#reveal-details').evaluate(el => el.inert), false);
    const savedCard = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).history[0].cardId, storageKey);
    assert.ok((await page.locator('#revealed-card img').getAttribute('src')).includes(savedCard));
    assert.match(await page.locator('#announcement').textContent(), /You drew/);
    await page.locator('#close-reveal').click();
    await settled();
    assert.equal(await page.locator('.card-pick').first().evaluate(el => el === document.activeElement), true);

    // Skipping reveals the already saved result, including with a keyboard.
    await page.locator('.card-pick').nth(1).click();
    await page.locator('#skip-reveal').focus();
    await page.keyboard.press('Enter');
    await completed();
    assert.equal(await total(), 2);
    assert.equal(await page.locator('#keep-card').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    await settled();

    // Escape cancels pending effects; reopening a gallery card cannot finish the old draw.
    await page.locator('.card-pick').last().click();
    await page.keyboard.press('Escape');
    await settled();
    assert.equal(await total(), 3);
    await page.goto(`${BASE}/charms.html#deck`);
    await page.locator('.gallery-card').first().click();
    assert.equal(await page.locator('#reveal-dialog').evaluate(el => el.classList.contains('cinematic')), false);
    assert.match(await page.locator('#saved-note').textContent(), /Not added/);
    await page.waitForTimeout(3900);
    assert.equal(await total(), 3);
    assert.equal(await page.locator('#reveal-dialog').isVisible(), true);
    assert.equal(await page.locator('#skip-reveal').isVisible(), false);
    await page.locator('#close-reveal').click();

    await page.locator('#header-draw').click();
    // Reloading mid-reveal keeps the draw, and the next pick still works.
    await page.locator('.card-pick').first().click();
    await page.reload();
    assert.equal(await total(), 4);
    assert.equal(await page.locator('#collection-count').textContent(), '4');
    await page.locator('.card-pick').first().click();
    await page.emulateMedia({reducedMotion:'reduce'});
    await completed();
    assert.equal(await page.locator('#skip-reveal').isVisible(), false);
    await page.locator('#close-reveal').click();
    await settled();

    // Reduced motion is immediate, and all controls/card edges fit small and landscape screens.
    for (const [width,height] of [[320,568],[390,844],[768,1024],[1440,1000],[844,390]]) {
      await page.setViewportSize({width,height});
      await page.locator('.card-pick').first().click();
      await completed();
      assert.equal(await page.locator('#skip-reveal').isVisible(), false);
      const layout = await page.locator('#reveal-dialog').evaluate(dialog => {
        const box = el => {const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
        return {width:dialog.clientWidth,scrollWidth:dialog.scrollWidth,card:box(document.querySelector('#revealed-card')),close:box(document.querySelector('#close-reveal'))};
      });
      assert.ok(layout.scrollWidth <= layout.width, `No horizontal scroll at ${width}×${height}: ${JSON.stringify(layout)}`);
      assert.ok(layout.card.left >= 0 && layout.card.right <= width, 'Card stays in the viewport');
      assert.ok(Math.abs(layout.card.width/layout.card.height-2/3)<.005, 'Artwork keeps its full 2:3 aspect ratio');
      assert.ok(layout.close.top >= 0 && layout.close.bottom <= height, 'Close is always reachable');
      await page.locator('#close-reveal').click();
      await settled();
    }
    assert.equal(await total(), 10);
    assert.deepEqual(errors, []);

    // Missing art still exposes the message and a working exit; no animation can trap the user.
    const broken = await browser.newPage({reducedMotion:'reduce'});
    await broken.route('**/assets/cards/*.webp', route => route.abort());
    await broken.goto(`${BASE}/charms.html`);
    await broken.locator('[data-category=love]').click();
    await broken.locator('[data-category=career]').click();
    await broken.locator('.card-pick').first().click();
    await broken.waitForFunction(() => document.querySelector('#reveal-dialog').classList.contains('art-unavailable'));
    assert.equal(await broken.locator('#keep-card').isVisible(), true);
    assert.ok((await broken.locator('#reveal-title').textContent()).length > 0);
    await broken.locator('#keep-card').click();
    await broken.close();
    console.log('Card reveal QA passed: touch and keyboard, full animation, one committed draw, skip, cancel, reload, gallery, reduced motion, 5 screen sizes, preserved artwork proportions, and failed-image recovery.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
