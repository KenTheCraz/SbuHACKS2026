(function(root){
function fresh(){return {status:'idle',checkpoint:0,sessionMs:0,blockMs:0,daily:{},breakUntil:0,breakReady:false,reminderDue:false}}
function dayKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function reconcile(state,now,interval){const s=JSON.parse(JSON.stringify(state));if(s.status==='running'){let cursor=s.checkpoint||now,end=Math.max(cursor,now);s.sessionMs+=end-cursor;s.blockMs+=end-cursor;while(cursor<end){const d=new Date(cursor),next=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime(),stop=Math.min(end,next);s.daily[dayKey(d)]=(s.daily[dayKey(d)]||0)+stop-cursor;cursor=stop}s.checkpoint=end;if(s.blockMs>=interval)s.reminderDue=true}if(s.status==='break'&&now>=s.breakUntil){s.status='paused';s.breakReady=true;s.breakUntil=0}return s}
function duration(ms){const seconds=Math.max(0,Math.floor(ms/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':')}
function remaining(end,now){return Math.max(0,Math.ceil((end-now)/1000)*1000)}
root.ExtrasCore={fresh,dayKey,reconcile,duration,remaining};
})(typeof window!=='undefined'?window:globalThis);
