import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
let version=0,savedValues={},calls=0,fail=false,conflict=false;
const ctx=vm.createContext({window:{accountBootstrap:{version:0,values:{},user:{id:'a'}},addEventListener(){}},document:{getElementById(){return null},addEventListener(){}},setTimeout(){return 1},clearTimeout(){},setInterval(){},AbortSignal,fetch:async(_url,opts)=>{calls++;if(fail)throw Error('offline');if(conflict)return Response.json({error:'Conflicting edits'},{status:409});const body=JSON.parse(opts.body);assert.equal(body.version,version);savedValues=body.values;return Response.json({version:++version})}});
vm.runInContext(fs.readFileSync('web/account-store.js','utf8'),ctx);const store=ctx.window.AccountStore;
store.setItem('taskleaf-theme','dark');assert.equal(await store.flush(),true);assert.equal(savedValues['taskleaf-theme'],'dark');assert.equal(store.clean,true);const count=calls;store.setItem('taskleaf-theme','dark');await store.flush();assert.equal(calls,count);
fail=true;store.setItem('taskleaf-theme','light');assert.equal(await store.flush(),false);assert.equal(store.clean,false);fail=false;assert.equal(await store.flush(),true);assert.equal(store.clean,true);
conflict=true;store.removeItem('taskleaf-theme');assert.equal(await store.flush(),false);const stopped=calls;assert.equal(await store.flush(),false);assert.equal(calls,stopped);assert.equal(savedValues['taskleaf-theme'],'light');
console.log('Account sync saves, unchanged-value deduplication, offline retries, and conflict preservation passed.');
