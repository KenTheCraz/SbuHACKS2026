import {PondError} from './pond-store.mjs';
import {json} from './auth.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createPonds(repository){return async function ponds(request,user){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/ponds'))return null;
 if(!user)return json({error:'Please log in to use Ponds.'},401);
 if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:'Request origin not allowed.'},403);
 try{
  if(path==='/api/ponds'&&request.method==='GET')return json(await repository.list(user.id));
  const match=path.match(/^\/api\/ponds\/([0-9a-f-]+)(?:\/(join|leave|heartbeat|messages))?$/i);
  if(path==='/api/ponds'&&request.method==='POST'){
   const data=await request.json();if(data.userId!==user.id)return json({error:'Your signed-in account changed. Reload before continuing.'},409);
   const name=typeof data.name==='string'?data.name.trim():'',topic=typeof data.topic==='string'?data.topic.trim():'';
   if(!name||name.length>60||topic.length>160)return json({error:'Give your pond a name up to 60 characters and a topic up to 160 characters.'},400);
   return json({roomId:await repository.create(user.id,name,topic)},201);
  }
  if(!match||!uuid.test(match[1]))return json({error:'Pond not found.'},404);
  const [,roomId,action]=match;
  if(!action&&request.method==='GET')return json(await repository.snapshot(user.id,roomId));
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(!['join','leave','heartbeat','messages'].includes(action))return json({error:'Pond not found.'},404);
  const data=await request.json();if(data.userId!==user.id)return json({error:'Your signed-in account changed. Reload before continuing.'},409);
  if(action==='join'){await repository.join(user.id,roomId);return json({ok:true})}
  if(action==='leave'){await repository.leave(user.id,roomId);return json({ok:true})}
  if(action==='heartbeat'){await repository.heartbeat(user.id,roomId);return json({ok:true})}
  const body=typeof data.body==='string'?data.body.trim():'';if(!body||body.length>500||typeof data.id!=='string'||!uuid.test(data.id))return json({error:'Write a message between 1 and 500 characters.'},400);
  await repository.message(user.id,roomId,data.id,body);return json({ok:true},201);
 }catch(e){if(e instanceof PondError)return json({error:e.message},e.status);if(e instanceof SyntaxError)return json({error:'Invalid request.'},400);throw e}
}}
