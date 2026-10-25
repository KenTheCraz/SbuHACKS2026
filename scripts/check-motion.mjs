import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const reduced={matches:false,addEventListener(){}},ctx=vm.createContext({window:{},homeSection:'home',applyHomeSection(){},matchMedia:()=>reduced,document:{body:{},querySelectorAll:()=>[]},MutationObserver:class{observe(){}}});
vm.runInContext(fs.readFileSync('web/motion.js','utf8'),ctx);const motion=ctx.window.TaskleafMotion;
const element=()=>({hidden:false,inert:false,animations:[],animate(){let resolve,reject;const animation={finished:new Promise((a,b)=>{resolve=a;reject=b}),cancel(){reject(Error('cancelled'))},finish(){resolve()}};this.animations.push(animation);return animation}});
let panel=element(),closed=0;motion.hide(panel,()=>{panel.hidden=true;closed++});assert.equal(panel.inert,true);assert.equal(motion.isHiding(panel),true);motion.show(panel);assert.equal(panel.inert,false);await Promise.resolve();assert.equal(closed,0);assert.equal(panel.hidden,false);
motion.hide(panel,()=>{panel.hidden=true;closed++});panel.animations.at(-1).finish();await Promise.resolve();assert.equal(closed,1);assert.equal(panel.hidden,true);assert.equal(panel.inert,false);
reduced.matches=true;panel=element();motion.show(panel);assert.equal(panel.animations.length,0);motion.hide(panel,()=>{panel.hidden=true});assert.equal(panel.hidden,true);assert.equal(panel.animations.length,0);
console.log('Interruptible panel transitions, delayed closing, focus safety, and reduced motion passed.');
