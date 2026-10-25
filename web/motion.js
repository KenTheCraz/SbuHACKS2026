// Small, interruptible transitions. Reduced-motion users get immediate changes.
window.TaskleafMotion=(()=>{
 const active=new WeakMap(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function cancel(el){const previous=active.get(el);if(previous){active.delete(el);previous.animation.cancel()}el.inert=false}
 function show(el){cancel(el);if(reduced.matches||!el.animate||el.hidden)return;const animation=el.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.3,1)'});const entry={animation,kind:'show'};active.set(el,entry);animation.finished.then(()=>{if(active.get(el)===entry)active.delete(el)}).catch(()=>{})}
 function hide(el,finish){if(active.get(el)?.kind==='hide')return;cancel(el);if(reduced.matches||!el.animate||el.hidden){finish();return}el.inert=true;const animation=el.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:140,easing:'ease-out'});const entry={animation,kind:'hide',finish};active.set(el,entry);animation.finished.then(()=>{if(active.get(el)!==entry)return;active.delete(el);finish();el.inert=false}).catch(()=>{})}
 const panels='#calendar-view,#extras-lockins-panel,#extras-timer-panel,#settings-general,#settings-lockins,#pond-lobby,#pond-room,#companion-panel';
 let shownSection=homeSection;const applyBeforeMotion=applyHomeSection;applyHomeSection=function(){applyBeforeMotion();if(shownSection!==homeSection){shownSection=homeSection;show(document.querySelector('main'))}};
 new MutationObserver(records=>{const seen=new Set();for(const record of records){const el=record.target;if(record.oldValue===null||el.hidden||!el.matches(panels)||seen.has(el))continue;seen.add(el);show(el)}}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden'],attributeOldValue:true});
 reduced.addEventListener('change',()=>{if(reduced.matches)document.querySelectorAll(panels+',#settings-panel,main').forEach(el=>{const pending=active.get(el);cancel(el);if(pending?.kind==='hide')pending.finish()})});
 return {show,hide,isHiding:el=>active.get(el)?.kind==='hide'};
})();
