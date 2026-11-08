const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'dist');
const port=4173;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
function send(res,status,body,type='text/plain; charset=utf-8',head=false){res.writeHead(status,{'Content-Type':type,'Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(head?undefined:body);}
const server=http.createServer((req,res)=>{
  const head=req.method==='HEAD';
  if(req.method!=='GET'&&!head) return send(res,405,'Method not allowed');
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{return send(res,400,'Invalid path');}
  if(pathname==='/__health') return send(res,200,JSON.stringify({app:'celestial-crossings-local-demo',version:'0.3.0',project:__dirname,url:`http://127.0.0.1:${port}`}),types['.json'],head);
  if(pathname.includes('\0')) return send(res,400,'Invalid path');
  // Reject backslashes on every OS so traversal protection does not depend on the platform's path separator.
  if(pathname.includes('\\')) return send(res,403,'Forbidden');
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)) return send(res,403,'Forbidden');
  fs.readFile(target,(error,buffer)=>{if(error)return send(res,404,'Not found');send(res,200,buffer,types[path.extname(target)]||'application/octet-stream',head);});
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Stop the other service or use the existing demo.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Celestial Crossings local demo: http://127.0.0.1:${port}\nBound to this laptop only. No external services or payment connections.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
