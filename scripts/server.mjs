import http from 'node:http';
import fs from 'node:fs';
import handler from '../dist/server/index.js';
import {createPonds} from '../server/ponds.mjs';
import {createStore} from '../server/store.mjs';
import {createAuth,accountKeys,json} from '../server/auth.mjs';
// Load optional local settings without overriding hosting-provided environment values.
if(fs.existsSync('.env.local'))for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const match=line.match(/^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.*?)\s*$/);if(match&&process.env[match[1]]===undefined)process.env[match[1]]=match[2].replace(/^(["'])(.*)\1$/,'$2')}
const local=process.argv.includes('--local'),port=Number(process.env.PORT||8765),host=local?'127.0.0.1':'0.0.0.0';
const store=await createStore(local?process.env:{...process.env,LOCAL_AUTH_DB:undefined});
const auth=createAuth(store,{secure:!local}),ponds=createPonds(store.ponds);
const authPage=fs.readFileSync(new URL('../web/auth.html',import.meta.url),'utf8');
const accountClient=fs.readFileSync(new URL('../web/account-store.js',import.meta.url),'utf8');
const secureHeaders={'x-content-type-options':'nosniff','referrer-policy':'same-origin','x-frame-options':'DENY','cache-control':'no-store'};
http.createServer(async(req,res)=>{try{
 const path=req.url?.split('?')[0];let length=0,chunks=[];
 for await(const chunk of req){length+=chunk.length;const max=path==='/api/extract'?12000000:path==='/api/account/data'?2000000:180000;if(length>max){res.writeHead(413);res.end('Request too large');return}chunks.push(chunk)}
 const forwarded=process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https'?'https':'http';
 const origin=process.env.PUBLIC_ORIGIN||`${forwarded}://${req.headers.host}`;
 const request=new Request(new URL(req.url,origin),{method:req.method,headers:new Headers(req.headers),...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
 const ip=process.env.TRUST_PROXY==='1'?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
 let response;
 if(path==='/healthz')response=json({ok:true});
 else response=await auth.handle(request,ip);
 if(!response){
  const user=await auth.current(request);
  if(!user){response=path.startsWith('/api/')?json({error:'Please log in to continue.'},401):new Response(request.method==='HEAD'?null:authPage,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})}
  else {
   response=await ponds(request,user)||await handler.fetch(request,{GROQ_API_KEY:process.env.GROQ_API_KEY,GROQ_CHAT_MODEL:process.env.GROQ_CHAT_MODEL,GROQ_VISION_MODEL:process.env.GROQ_VISION_MODEL,ACCOUNT_ID:user.id});
   if((path==='/'||path==='/index.html')&&request.method==='GET'){
    const snapshot=await store.read(user.id);const bootstrap=JSON.stringify({...snapshot,user,keys:accountKeys}).replaceAll('<','\\u003c');
    const html=(await response.text()).replace('<head>','<head><script>window.accountBootstrap='+bootstrap+';'+accountClient+'</script>');
    response=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
   }
  }
 }
 res.writeHead(response.status,{...secureHeaders,...Object.fromEntries(response.headers)});res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'Account storage is temporarily unavailable. Please retry.'}))}
}).listen(port,host,()=>console.log(`Taskleaf listening on http://${host}:${port}`));
