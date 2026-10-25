// Account data lives in memory while open and in the server database when saved.
window.AccountStore=(()=>{
 let values={...window.accountBootstrap.values},version=window.accountBootstrap.version,dirty=0,saved=0,pending=null,timer=null,blocked=false;
 const status=text=>{const el=document.getElementById('account-sync');if(el)el.textContent=text};
 function conflict(message){blocked=true;status('Sync paused');const bar=document.getElementById('account-conflict');if(bar){bar.hidden=false;bar.querySelector('span').textContent=message}}
 async function flush(){clearTimeout(timer);timer=null;if(blocked)return false;if(pending){await pending;if(blocked)return false;return dirty!==saved?flush():true}if(dirty===saved)return true;
  const snapshot={...values},generation=dirty;
  pending=(async()=>{try{status('Saving…');const r=await fetch('/api/account/data',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({userId:window.accountBootstrap.user.id,version,values:snapshot}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(r.status===401||r.status===409){conflict(d.error);return false}if(!r.ok)throw Error(d.error||'Could not save');version=d.version;saved=generation;status('Saved to account');return true}catch{status('Not saved · retrying');return false}finally{pending=null;if(!blocked&&dirty!==saved&&!timer)timer=setTimeout(flush,5000)}})();return pending;
 }
 function changed(key){dirty++;status('Saving…');if(!timer)timer=setTimeout(flush,key==='taskleaf-lockins-v1'?5000:750)}
 window.addEventListener('beforeunload',e=>{if(dirty!==saved){e.preventDefault();e.returnValue=''}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});window.addEventListener('online',flush);window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
 async function refresh(){if(document.hidden||pending||blocked)return;const checkedVersion=version;try{const r=await fetch('/api/account/session',{cache:'no-store'});if(r.status===401){conflict('Your session ended. Save a copy, then log in again.');return}const session=await r.json();if(session.user?.id!==window.accountBootstrap.user.id){conflict('The signed-in account changed in another tab. Reload before continuing.');return}const response=await fetch('/api/account/data',{cache:'no-store'});if(!response.ok)return;const remote=await response.json();if(checkedVersion!==version||pending)return;if(remote.version!==version){if(dirty===saved)location.reload();else conflict('Your account changed in another tab or device. Save a copy, then reload.')}}catch{}}
 setInterval(refresh,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 return {getItem:key=>Object.hasOwn(values,key)?values[key]:null,setItem(key,value){value=String(value);if(values[key]===value)return;values[key]=value;changed(key)},removeItem(key){if(Object.hasOwn(values,key)){delete values[key];changed(key)}},flush,snapshot:()=>({...values}),get clean(){return dirty===saved}};
})();
