// Browser QA for the shared extras: bug-report button and optional Supabase accounts.
// Supabase is mocked with request interception, so no real project is needed.
const assert=require('node:assert/strict');
const {launch,BASE}=require('./qa-browser.cjs');
const fakeConfig=`window.MOOJAI_CONFIG={version:'test',supabaseUrl:'https://demo.supabase.co',supabaseAnonKey:'anon',products:{},githubRepo:'MOSOKODOMO/celestial-crossings',supportEmail:''};`;
(async()=>{
  const browser=await launch();
  try{
    // 1. Accounts off (default config): no account button, no outside requests, bug button works.
    for(const path of ['/reading.html','/']){
      const page=await browser.newPage({viewport:{width:390,height:844}});
      // Check the generated issue URL without depending on GitHub's login redirects.
      // Context routing also covers the popup's first navigation.
      await page.context().route('https://github.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Issue preview</title>'}));
      const external=[];page.on('request',r=>{if(!r.url().startsWith(BASE)&&!/^(data|blob):/.test(r.url()))external.push(r.url());});
      await page.goto(BASE+path);
      assert.equal(await page.locator('#account-button').count(),0,'account button hidden without Supabase config');
      await page.click('#bug-report-button');
      assert.ok(await page.locator('#bug-dialog').evaluate(d=>d.open));
      await page.click('#bug-dialog [data-bug=copy]');
      assert.match(await page.locator('#bug-dialog .mj-status').innerText(),/./,'empty report is rejected with a message');
      await page.fill('#bug-dialog [name=what]','Test problem');
      const popup=page.waitForEvent('popup');
      await page.click('#bug-dialog [data-bug=github]');
      const reportPage=await popup;
      const url=reportPage.url();
      assert.match(url,/github\.com\/MOSOKODOMO\/celestial-crossings\/issues\/new/);
      assert.match(decodeURIComponent(url),/Test problem/);
      assert.doesNotMatch(decodeURIComponent(url),/birth|วันเกิด: \d/i);
      assert.deepEqual(external.filter(u=>!u.includes('github.com')),[]);
      await reportPage.close();
      await page.close();
    }
    // 2. Reader nav links to the collector in both languages.
    {const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto(BASE+'/reading.html');
     assert.equal(await page.locator('.main-nav a[href="./"]').innerText().then(t=>t.includes('การ์ดมูใจ')),true);
     await page.click('[data-language=en]');assert.match(await page.locator('.main-nav a[href="./"]').innerText(),/Card charms/);
     assert.match(await page.locator('#bug-report-button').innerText(),/Report a problem/);await page.close();}
    // 2b. Site structure: dark MooJai page is home, reader at reading.html, old collect.html links redirect.
    {const page=await browser.newPage({viewport:{width:1280,height:900}});
     await page.goto(BASE+'/');assert.ok(await page.locator('#card-picks').count(),'home is the dark charms page');
     assert.ok(await page.locator('.world-link').isVisible(),'hero links to Pet World');assert.ok(await page.locator('#pet-world a.gold-button[href="world.html"]').isVisible(),'Pet World section has an Enter button');
     await page.click('header nav a[href="reading.html"]');await page.waitForURL(/reading\.html/);assert.ok(await page.locator('#read-button').count(),'reader reachable from home');
     await page.goto(BASE+'/collect.html#ritual');await page.waitForURL(u=>!u.pathname.endsWith('collect.html'));
     assert.equal(new URL(page.url()).pathname,'/');assert.equal(new URL(page.url()).hash,'#ritual');
     const missing=await page.goto(BASE+'/no-such-page');assert.equal(missing.status(),404);assert.ok(await page.locator('[data-reading]').count());
     await page.close();}
    // 2c. Phones (top menu hidden) still reach Pet World from the home page.
    {const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(BASE+'/');
     assert.ok(await page.locator('.world-link').isVisible(),'Pet World link visible on phones');await page.close();}
    // 3. Accounts on (mocked): sign-up, wrong password, sign-in, sign-out, bug report to Supabase.
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const calls=[];
    await page.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:fakeConfig}));
    await page.route('https://demo.supabase.co/**',r=>{const u=r.request().url();calls.push(u.replace('https://demo.supabase.co',''));
      if(u.includes('grant_type=password')){const b=JSON.parse(r.request().postData());return b.password==='correct-horse'?r.fulfill({json:{access_token:'tok',refresh_token:'ref',expires_in:3600,user:{id:'u1',email:b.email}}}):r.fulfill({status:400,json:{error_code:'invalid_credentials'}});}
      if(u.includes('/signup'))return r.fulfill({json:{id:'u2',email:'n@b.co'}});
      if(u.includes('/logout'))return r.fulfill({status:204,body:''});
      if(u.includes('/rest/v1/bug_reports')){const b=JSON.parse(r.request().postData());assert.equal(b.description,'Broken');return r.fulfill({status:201,body:''});}
      return r.fulfill({status:404,json:{}});});
    await page.goto(BASE+'/reading.html');
    await page.click('#account-button');
    await page.click('#account-dialog [data-action=signup]');
    await page.fill('#account-dialog [name=email]','n@b.co');await page.fill('#account-dialog [name=password]','abcdefgh');await page.fill('#account-dialog [name=confirm]','abcdefgX');
    await page.click('#account-dialog [type=submit]');
    assert.match(await page.locator('#account-dialog .mj-status').innerText(),/ไม่ตรงกัน/);
    await page.fill('#account-dialog [name=confirm]','abcdefgh');await page.click('#account-dialog [type=submit]');
    await page.waitForFunction(()=>/อีเมล/.test(document.querySelector('#account-dialog .mj-status').textContent));
    await page.click('#account-dialog [data-action=signin]');
    await page.fill('#account-dialog [name=email]','a@b.co');await page.fill('#account-dialog [name=password]','wrong-pass');await page.click('#account-dialog [type=submit]');
    await page.waitForFunction(()=>/ไม่ถูกต้อง/.test(document.querySelector('#account-dialog .mj-status').textContent));
    await page.fill('#account-dialog [name=password]','correct-horse');await page.click('#account-dialog [type=submit]');
    await page.waitForFunction(()=>!document.querySelector('#account-dialog').open);
    assert.ok(await page.locator('#account-button.is-signed-in').count());
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('moojai-auth-v1')).user.email),'a@b.co');
    // Birth details never travel with account traffic.
    await page.locator('[name=birthDay]').fill('14');await page.locator('[name=birthMonth]').selectOption('2');await page.locator('[name=birthYear]').fill('1995');await page.click('#read-button');
    await page.click('#bug-report-button');await page.fill('#bug-dialog [name=what]','Broken');await page.click('#bug-dialog [type=submit]');
    await page.waitForFunction(()=>/ขอบคุณ/.test(document.querySelector('#bug-dialog .mj-status').textContent));
    await page.keyboard.press('Escape');
    await page.click('#account-button');await page.click('#account-dialog [data-action=signout]');
    assert.equal(await page.locator('#account-button.is-signed-in').count(),0);
    assert.ok(calls.some(c=>c.startsWith('/auth/v1/logout')));
    assert.ok(calls.every(c=>!/1995|birth/i.test(c)));
    await page.close();
    console.log('Passed: bug report (validation, GitHub prefill, Supabase submit), hidden accounts without config, sign-up validation and confirmation, wrong password, sign-in/out, collector nav link, no birth data in account traffic.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
