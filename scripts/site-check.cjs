// Live-site health check for MooJai.
//
//   node scripts/site-check.cjs [url] [--browser] [--json report.json]
//
// Default URL is the public GitHub Pages site. Checks, without any packages:
//   - both pages and the 404 page answer correctly
//   - every script, stylesheet, image and font the pages reference loads
//   - all 30 card images and the generated reading data are present
//   - the deployed config.js does not contain secret keys
// With --browser (needs Playwright, as in `npm run qa`), it also opens both pages
// in headless Chromium, reports console errors, completes a free reading and
// draws one charm.
// Exit code 0 = healthy, 1 = problems found. Designed for scheduled runs.
'use strict';
const args = process.argv.slice(2);
const BASE = (args.find(a => /^https?:\/\//.test(a)) || process.env.SITE_URL || 'https://mosokodomo.github.io/celestial-crossings/').replace(/\/?$/, '/');
const useBrowser = args.includes('--browser');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const results = [];
const record = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

async function get(url, { timeout = 20000 } = {}) {
  const started = Date.now();
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeout), headers: { 'Cache-Control': 'no-cache' } });
  const body = Buffer.from(await response.arrayBuffer());
  return { status: response.status, type: response.headers.get('content-type') || '', body, ms: Date.now() - started };
}
function references(html) {
  const found = new Set();
  for (const m of html.matchAll(/\b(?:src|href)="([^"#?]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|data:|javascript:)/.test(ref) || ref.endsWith('.html') || ref === './' || ref.startsWith('#')) continue;
    found.add(ref);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) m[1].split(',').forEach(part => found.add(part.trim().split(/\s+/)[0]));
  return [...found];
}

async function httpChecks() {
  const pages = { 'index.html': '', 'reading.html': '' };
  for (const [name, expect] of [['', 'A little clarity'], ['reading.html', 'มูใจ'], ['charms.html', 'Your charms'], ['world.html', 'MooJai World'], ['collect.html', 'location.replace']]) {
    try {
      const r = await get(BASE + name);
      const html = r.body.toString('utf8');
      record(`page ${name || '/'} loads`, r.status === 200 && html.includes(expect), `HTTP ${r.status}, ${r.ms} ms`);
      if (r.ms > 4000) record(`page ${name || '/'} response time`, false, `${r.ms} ms is slow`);
      if (name !== 'collect.html') pages[name || 'index.html'] = html;
    } catch (error) { record(`page ${name || '/'} loads`, false, error.message); }
  }
  try {
    const r = await get(BASE + 'this-page-should-not-exist-' + Date.now());
    record('404 page', r.status === 404 && r.body.toString('utf8').includes('MooJai'), `HTTP ${r.status}`);
  } catch (error) { record('404 page', false, error.message); }

  const assets = new Set();
  Object.values(pages).forEach(html => references(html).forEach(ref => assets.add(ref)));
  for (const n of ['love', 'career', 'wealth', 'wellbeing', 'connection', 'growth'])
    for (const r of ['C', 'R', 'S', 'SR', 'SSR']) assets.add(`assets/cards/${n}-${r}.webp`);
  ['assets/collector-background.webp', 'assets/og-image.jpg', 'fortune-library.json', 'fortune-library-th-en.html', 'sitemap.xml'].forEach(a => assets.add(a));
  const failed = [];
  await Promise.all([...assets].map(async ref => {
    try { const r = await get(BASE + ref.replace(/^\.\//, '')); if (r.status !== 200 || r.body.length === 0) failed.push(`${ref} (HTTP ${r.status})`); }
    catch (error) { failed.push(`${ref} (${error.message})`); }
  }));
  record(`${assets.size} referenced files load`, failed.length === 0, failed.slice(0, 10).join(', '));

  try {
    const lib = JSON.parse((await get(BASE + 'fortune-library.json')).body.toString('utf8'));
    record('reading library is complete', lib.cores && lib.cores.length === 52, `${lib.cores ? lib.cores.length : 0} core fortunes`);
  } catch (error) { record('reading library is complete', false, error.message); }

  try {
    const config = (await get(BASE + 'config.js')).body.toString('utf8');
    const leaked = /service_role|sk_live_|sk_test_|whsec_/.test(config);
    record('no secret keys in config.js', !leaked, leaked ? 'config.js contains a secret-looking key — rotate it now' : '');
    const supabase = (config.match(/supabaseUrl:\s*'([^']*)'/) || [])[1];
    if (supabase) {
      try {
        const r = await get(supabase.replace(/\/$/, '') + '/auth/v1/health', { timeout: 10000 });
        record('Supabase auth reachable', r.status < 500, `HTTP ${r.status}`);
      } catch (error) { record('Supabase auth reachable', false, error.message); }
    } else record('accounts', true, 'not configured yet (skipped)');
  } catch (error) { record('config.js loads', false, error.message); }
}

async function browserChecks() {
  let chromium;
  try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); }
  catch { record('browser checks', false, 'Playwright not installed — run npm ci && npx playwright install chromium'); return; }
  const browser = await chromium.launch({ headless: true, ...(process.env.QA_BROWSER ? { executablePath: process.env.QA_BROWSER } : {}) });
  try {
    for (const [name, width] of [['desktop', 1280], ['mobile', 390]]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('requestfailed', r => errors.push(`failed: ${r.url()}`));

      await page.goto(BASE + 'reading.html', { waitUntil: 'networkidle' });
      await page.locator('[name=birthDay]').fill('14');
      await page.locator('[name=birthMonth]').selectOption('2');
      await page.locator('[name=birthYear]').fill('1995');
      await page.locator('#read-button').click();
      const reading = await page.locator('#reading-result').innerText({ timeout: 8000 }).catch(() => '');
      record(`${name}: free reading completes`, reading.length > 200, `${reading.length} characters`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      record(`${name}: reader has no sideways scroll`, overflow <= 1, overflow > 1 ? `${overflow}px wider than screen` : '');

      await page.goto(BASE + 'charms.html', { waitUntil: 'networkidle' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('[data-category=love]').click();
      await page.locator('[data-category=career]').click();
      await page.locator('#card-picks button').first().click();
      const revealed = await page.locator('#reveal-dialog[open]').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
      record(`${name}: charm draw reveals a card`, revealed);
      const brokenImages = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src).map(i => i.src.split('/').pop()));
      record(`${name}: no broken images`, brokenImages.length === 0, brokenImages.join(', '));
      record(`${name}: bug report button present`, await page.locator('#bug-report-button').count() === 1);
      await page.evaluate(() => localStorage.clear());
      record(`${name}: no console errors`, errors.length === 0, errors.slice(0, 5).join(' | '));
      await page.close();
    }
  } finally { await browser.close(); }
}

(async () => {
  console.log(`MooJai site check → ${BASE}\n${new Date().toISOString()}\n`);
  await httpChecks();
  if (useBrowser) await browserChecks();
  const failed = results.filter(r => !r.ok);
  console.log(`\n${failed.length ? `${failed.length} problem(s) found.` : 'All checks passed.'}`);
  if (jsonOut) require('node:fs').writeFileSync(jsonOut, JSON.stringify({ url: BASE, checkedAt: new Date().toISOString(), passed: !failed.length, results }, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
