import {randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback),ttl=30*86400000;
export const accountKeys=['taskleaf-grades-v1','taskleaf-v1','taskleaf-theme','taskleaf-sidebar-collapsed','taskleaf-weather','taskleaf-lockins-v1','taskleaf-lockin-settings','taskleaf-countdown-v1','taskleaf-leaf-history','taskleaf-study-celebration-rotation','taskleaf-study-level'];
export async function hashPassword(password,salt=randomBytes(16).toString('hex')){return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex')}
export async function checkPassword(password,hash){const [salt,expected]=hash.split(':');const actual=await hashPassword(password,salt);return expected.length===128&&timingSafeEqual(Buffer.from(actual.split(':')[1],'hex'),Buffer.from(expected,'hex'))}
const digest=token=>createHash('sha256').update(token).digest('hex');
export const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'cache-control':'no-store',...headers}});
export function createAuth(store,{secure=true}={}){
 const dummyHash=hashPassword('dummy-account-check');
 const cookieName=secure?'__Host-taskleaf':'taskleaf_session',attempts=new Map();let active=0;
 function token(request){const value=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);return /^[a-f0-9]{64}$/.test(value||'')?value:null}
 const cookie=(value,age)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`;
 async function current(request){const t=token(request);return t?await store.session(digest(t)):null}
 async function handle(request,ip='unknown'){
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/account/'))return null;
  if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request origin not allowed.'},403);
  if(path==='/api/account/login'||path==='/api/account/signup'){
   if(request.method!=='POST')return json({error:'Use POST.'},405);
   const now=Date.now();for(const [k,v] of attempts)if(now-v.at>900000)attempts.delete(k);if(attempts.size>5000)return json({error:'Please try again later.'},429);
   const bucket=attempts.get(ip)||{at:now,n:0};attempts.set(ip,bucket);if(++bucket.n>15||active>=4)return json({error:'Too many attempts. Please try again in 15 minutes.'},429);
   let body;try{body=await request.json()}catch{return json({error:'Invalid request.'},400)}
   const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';const password=body.password;
   if(!/^[a-z0-9_]{3,30}$/.test(username)||typeof password!=='string'||password.length<10||password.length>128)return json({error:'Use a username with 3–30 letters, numbers, or underscores and a password with 10–128 characters.'},400);
   active++;
   try{let user;
    if(path.endsWith('/signup')){const id=randomUUID();if(!await store.register(id,username,await hashPassword(password)))return json({error:'That username is unavailable.'},409);user={id,username}}
    else {user=await store.user(username);const valid=await checkPassword(password,user?.password_hash||await dummyHash);if(!user||!valid)return json({error:'Incorrect username or password.'},401)}
    const value=randomBytes(32).toString('hex');await store.issue(digest(value),user.id,Date.now()+ttl);return json({user:{id:user.id,username:user.username}},200,{'set-cookie':cookie(value,ttl/1000)})
   }finally{active--}
  }
  const user=await current(request);if(!user)return json({error:'Please log in to continue.'},401);
  if(path==='/api/account/session'&&request.method==='GET')return json({user});
  if(path==='/api/account/logout'&&request.method==='POST'){const t=token(request);if(t)await store.revoke(digest(t));return json({ok:true},200,{'set-cookie':cookie('',0)})}
  if(path==='/api/account/data'){
   if(request.method==='GET')return json(await store.read(user.id));
   if(request.method==='PUT'){
    let body;try{body=await request.json()}catch{return json({error:'Invalid account data.'},400)}
    if(body.userId!==user.id)return json({error:'The signed-in account changed. Save a copy, then reload.'},409);
    if(!Number.isInteger(body.version)||body.version<0||!body.values||Array.isArray(body.values)||typeof body.values!=='object'||Object.keys(body.values).some(k=>!accountKeys.includes(k))||Object.values(body.values).some(v=>typeof v!=='string')||JSON.stringify(body.values).length>1500000)return json({error:'Invalid account data or storage limit exceeded.'},400);
    for(const [k,v] of Object.entries(body.values)){if(k==='taskleaf-theme'||k==='taskleaf-sidebar-collapsed')continue;try{const data=JSON.parse(v);if(k==='taskleaf-v1'&&(!data||!Array.isArray(data.tasks)||!Array.isArray(data.cats)))throw Error()}catch{return json({error:'Invalid saved data.'},400)}}
    const version=await store.write(user.id,body.version,body.values);return version===null?json({error:'Your account changed in another tab or device. Reload to get the latest data.'},409):json({version});
   }
  }
  return json({error:'Not found.'},404);
 }
 return {current,handle};
}
