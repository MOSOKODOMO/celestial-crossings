// Runs the browser QA scripts against the local demo server.
// Reuses a server already running on 127.0.0.1:4173, otherwise starts one for the run and stops it afterwards.
const {spawn,spawnSync}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const project=path.resolve(__dirname,'..');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const scripts=['browser.qa.cjs','date-boundary.qa.cjs','reading-modes.qa.cjs','landing.qa.cjs','experience.qa.cjs','collect.qa.cjs','card-reveal.qa.cjs','extras.qa.cjs','world.qa.cjs','world-care.qa.cjs','world-animation.qa.cjs','world-online.qa.cjs'];
const health=()=>new Promise(resolve=>{
  const req=http.get(base+'/__health',res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>{try{const data=JSON.parse(body);resolve(data.app==='moojai-local-demo'&&path.resolve(data.project)===project);}catch{resolve(false);}});});
  req.on('error',()=>resolve(false));req.setTimeout(1500,()=>{req.destroy();resolve(false);});
});
(async()=>{
  let server=null;
  if(!(await health())){
    server=spawn(process.execPath,[path.join(project,'server.cjs')],{cwd:project,stdio:'ignore',env:{...process.env,MOOJAI_PORT:new URL(base).port||'4173'}});
    for(let i=0;i<40&&!(await health());i++)await new Promise(r=>setTimeout(r,250));
    if(!(await health())){server.kill();console.error('Demo server did not start at '+base);process.exit(1);}
  }
  let failed=0;
  try{
    for(const file of scripts){
      console.log(`\n▶ ${file}`);
      const result=spawnSync(process.execPath,[path.join(project,'tests',file)],{cwd:project,stdio:'inherit'});
      if(result.status!==0)failed++;
    }
  }finally{if(server)server.kill();}
  console.log(failed?`\n${failed} of ${scripts.length} browser QA scripts failed.`:`\nAll ${scripts.length} browser QA scripts passed.`);
  process.exit(failed?1:0);
})();
