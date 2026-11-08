// Runs the browser QA scripts against the local demo server.
// Reuses a server already running on 127.0.0.1:4173, otherwise starts one for the run and stops it afterwards.
const {spawn,spawnSync}=require('node:child_process');
const http=require('node:http');
const path=require('node:path');
const project=path.resolve(__dirname,'..');
const scripts=['browser.qa.cjs','date-boundary.qa.cjs','reading-modes.qa.cjs','landing.qa.cjs'];
const health=()=>new Promise(resolve=>{
  const req=http.get('http://127.0.0.1:4173/__health',res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>{try{resolve(JSON.parse(body).app==='celestial-crossings-local-demo');}catch{resolve(false);}});});
  req.on('error',()=>resolve(false));req.setTimeout(1500,()=>{req.destroy();resolve(false);});
});
(async()=>{
  let server=null;
  if(!(await health())){
    server=spawn(process.execPath,[path.join(project,'server.cjs')],{cwd:project,stdio:'ignore'});
    for(let i=0;i<40&&!(await health());i++)await new Promise(r=>setTimeout(r,250));
    if(!(await health())){server.kill();console.error('Demo server did not start on 127.0.0.1:4173.');process.exit(1);}
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
