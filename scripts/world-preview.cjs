const {launch,BASE}=require('../tests/qa-browser.cjs');
const fs=require('node:fs');
(async()=>{
 const browser=await launch();
 try {
  for(const [label,width,height]of [['desktop',1440,900],['mobile',390,844]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
   await context.addInitScript(()=>{localStorage.setItem('moojai-world-v1',JSON.stringify({name:'Mali',language:'en'}));localStorage.setItem('celestial-atelier-preview-v1',JSON.stringify({history:[{cardId:'love-C'},{cardId:'career-R'},{cardId:'wellbeing-C'}]}));});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.goto(BASE+'/world.html');
   await page.waitForFunction(()=>window.MooJaiWorld?.snapshot().ready,{},{timeout:30000}).catch(async e=>{console.log('boot failure',errors,await page.locator('#loading').innerText());throw e;});await page.waitForTimeout(4000);
   fs.mkdirSync('output/world',{recursive:true});await page.screenshot({path:`output/world/preview-${label}.png`});
   if(errors.length)throw new Error(errors.join('\n'));
   console.log(label,JSON.stringify(await page.evaluate(()=>MooJaiWorld.snapshot().metrics)));
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
