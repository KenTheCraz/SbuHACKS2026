// Confirm new tasks after account storage acknowledges the save.
const notifiedTaskIds=new Set(state.tasks.map(task=>task.id));
const saveBeforeTaskNotification=save;
save=function(){
 const created=state.tasks.filter(task=>!notifiedTaskIds.has(task.id)).map(task=>({id:task.id,cat:task.cat}));
 const result=saveBeforeTaskNotification();
 state.tasks.forEach(task=>notifiedTaskIds.add(task.id));
 if(created.length)AccountStore.flush().then(saved=>{
  if(!saved)return;
  const remaining=created.filter(task=>state.tasks.some(current=>current.id===task.id));
  if(!remaining.length)return;
  const categories=[...new Set(remaining.map(task=>task.cat))].join(', ');
  toast(remaining.length===1?`task has been added to ${categories}`:`${remaining.length} tasks have been added to ${categories}`);
 }).catch(()=>{});
 return result;
};
$('#toast').setAttribute('role','status');$('#toast').setAttribute('aria-live','polite');$('#toast').setAttribute('aria-atomic','true');
