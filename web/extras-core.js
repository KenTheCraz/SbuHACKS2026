(function(root){
function fresh(){return {status:'idle',startedAt:0,previousSession:null,checkpoint:0,sessionMs:0,blockMs:0,daily:{},breakUntil:0,breakReady:false,reminderDue:false}}
function endSession(state,now){const previousSession=state.status!=='idle'?{startedAt:state.startedAt||null,endedAt:now,durationMs:state.sessionMs}:state.previousSession||null;return {...fresh(),daily:{...state.daily},previousSession}}
function startSession(state,now){return {...endSession(state,now),status:'running',startedAt:now,checkpoint:now}}
function studyMilestone(daily,today){return studyDay(daily,dayKey(today)).difference>=30*60000}
const celebrationMessages=[
 ['Look at you grow! 🌱🎉','You’ve studied {minutes} minutes more than yesterday. One step stronger.'],
 ['A little extra. A big win. 🥳','{minutes} more minutes than yesterday—give yourself some credit!'],
 ['You showed up and then some! ✨👏','You’ve added {minutes} minutes beyond yesterday’s study time.'],
 ['Your effort is blooming! 🌿🎊','{minutes} minutes more than yesterday. Take a breath and celebrate.'],
 ['Progress looks good on you! 🎉💚','You’ve studied {minutes} minutes more than yesterday. Nicely done!']
];
function celebrationForDay(previous,day){const valid=previous&&Number.isInteger(previous.index)&&previous.index>=0&&previous.index<celebrationMessages.length;return valid&&previous.day===day?previous:{day,index:valid?(previous.index+1)%celebrationMessages.length:0}}
function celebrationMessage(index,minutes){const message=celebrationMessages[index]||celebrationMessages[0];return {title:message[0],body:message[1].replace('{minutes}',String(minutes))}}
function dayKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function reconcile(state,now,interval){const s=JSON.parse(JSON.stringify(state));if(s.status==='running'){let cursor=s.checkpoint||now,end=Math.max(cursor,now);s.sessionMs+=end-cursor;s.blockMs+=end-cursor;while(cursor<end){const d=new Date(cursor),next=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime(),stop=Math.min(end,next);s.daily[dayKey(d)]=(s.daily[dayKey(d)]||0)+stop-cursor;cursor=stop}s.checkpoint=end;if(s.blockMs>=interval)s.reminderDue=true}if(s.status==='break'&&now>=s.breakUntil){s.status='paused';s.breakReady=true;s.breakUntil=0}return s}
function duration(ms){const seconds=Math.max(0,Math.floor(ms/1000));return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':')}
function remaining(end,now){return Math.max(0,Math.ceil((end-now)/1000)*1000)}
function historyStart(today){const day=today.getDate(),start=new Date(today.getFullYear(),today.getMonth()-2,1,12);start.setDate(Math.min(day,new Date(start.getFullYear(),start.getMonth()+1,0).getDate()));return start}
function studyDay(daily,key){const date=new Date(key+'T12:00:00'),previous=new Date(date);previous.setDate(previous.getDate()-1);const ms=daily[key]||0,previousMs=daily[dayKey(previous)]||0;return {date,previous,ms,previousMs,difference:ms-previousMs}}
root.ExtrasCore={fresh,startSession,endSession,studyMilestone,celebrationForDay,celebrationMessage,dayKey,reconcile,duration,remaining,historyStart,studyDay};
})(typeof window!=='undefined'?window:globalThis);
