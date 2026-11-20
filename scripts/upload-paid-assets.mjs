// Default: validate locally. --upload requires a server key supplied securely
// in the process environment. Credentials and signed URLs are never printed.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),bucket='moojai-paid';
const assets=['C','R','S','SR','SSR'].flatMap(rank=>[
  {file:`dist/assets/cards/growth-${rank}.webp`,name:`cards/growth-${rank}.webp`,type:'image/webp'},
  {file:`output/wallpaper-growth-v1/growth-${rank.toLowerCase()}-wallpaper-v1.png`,name:`wallpapers/growth-${rank}.png`,type:'image/png'}
]);
const sha=data=>createHash('sha256').update(data).digest('hex');
async function main(){
  for(const asset of assets){asset.bytes=await readFile(path.join(root,asset.file));if(!asset.bytes.length||asset.bytes.length>10*1024*1024)throw new Error('Unexpected asset size: '+asset.name);}
  if(!process.argv.includes('--upload')){console.log(`Ready: ${assets.length} card/wallpaper files. No network requests made.`);return;}
  const url=(process.env.SUPABASE_URL||'').replace(/\/+$/,''),key=process.env.SUPABASE_SERVER_KEY||'';
  if(url!=='https://tlixjcgravudrpgsuuxt.supabase.co'||!key)throw new Error('Set MooJai SUPABASE_URL and SUPABASE_SERVER_KEY securely in the environment.');
  const headers={apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key})};
  async function request(endpoint,init={}){return fetch(url+'/storage/v1/'+endpoint,{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(30000)});}
  const existing=await request('bucket/'+bucket);
  if(existing.ok){if((await existing.json()).public)throw new Error('Refusing to upload paid originals into a public bucket.');}
  else if(existing.status===404||existing.status===400){
    const created=await request('bucket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false,file_size_limit:10485760,allowed_mime_types:['image/png','image/webp']})});
    if(!created.ok)throw new Error('Private bucket creation failed: HTTP '+created.status);
  }else throw new Error('Bucket inspection failed: HTTP '+existing.status);
  for(const asset of assets){
    const uploaded=await request('object/'+bucket+'/'+asset.name,{method:'POST',headers:{'Content-Type':asset.type,'x-upsert':'true'},body:asset.bytes});
    if(!uploaded.ok)throw new Error('Upload failed for '+asset.name+': HTTP '+uploaded.status);
    const downloaded=await request('object/authenticated/'+bucket+'/'+asset.name);
    if(!downloaded.ok||sha(Buffer.from(await downloaded.arrayBuffer()))!==sha(asset.bytes))throw new Error('Uploaded bytes did not verify for '+asset.name);
    console.log('Verified '+asset.name);
  }
  console.log('Private bundle originals uploaded and verified.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
