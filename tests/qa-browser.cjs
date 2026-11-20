// Shared browser launcher for the QA scripts. Resolves Playwright and a browser
// without assuming one machine's layout:
//   1. PLAYWRIGHT_MODULE env var (path to a playwright package or its package.json)
//   2. a normal require('playwright') (global or local install)
//   3. the Codex runtime bundle used when this prototype was first built
// Browser: QA_BROWSER env var, else Microsoft Edge on Windows if present, else Playwright's own Chromium.
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
function loadPlaywright(){
  const tries=[];
  if(process.env.PLAYWRIGHT_MODULE)tries.push(()=>createRequire(path.resolve(process.env.PLAYWRIGHT_MODULE,process.env.PLAYWRIGHT_MODULE.endsWith('.json')?'':'package.json'))('playwright'));
  tries.push(()=>require('playwright'));
  tries.push(()=>createRequire(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright'));
  for(const attempt of tries){try{return attempt();}catch{}}
  throw new Error('Playwright not found. Set PLAYWRIGHT_MODULE to a folder containing the playwright package, or install it globally (npm i -g playwright).');
}
function browserPath(){
  if(process.env.QA_BROWSER)return process.env.QA_BROWSER;
  const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
  return edge;
}
async function launch(){
  const {chromium}=loadPlaywright();
  const executablePath=browserPath();
  // CI runners have no GPU: ask Chromium for its software WebGL renderer explicitly so the 3D world can start.
  const args=process.platform==='linux'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[];
  return chromium.launch({headless:true,args,...(executablePath?{executablePath}:{})});
}
async function navigate(page,view){
  const target=page.locator(`[data-page=${view}]`);
  if(!(await target.isVisible()))await page.locator('.menu-toggle').click();
  await target.click();
}
async function fillBirthday(page,value){
  const [year,month,day]=value.split('-');
  await page.locator('[name=birthEra]').selectOption('ce');
  await page.locator('[name=birthDay]').fill(String(Number(day)));
  await page.locator('[name=birthMonth]').selectOption(String(Number(month)));
  await page.locator('[name=birthYear]').fill(year);
}
module.exports={launch,navigate,fillBirthday,BASE:process.env.QA_BASE_URL||'http://127.0.0.1:4173'};
