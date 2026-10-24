import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('web/extras-core.js','utf8'),ctx);const c=ctx.ExtrasCore,start=new Date(2026,9,24,23,30).getTime();let s=c.fresh();s.status='running';s.checkpoint=start;s=c.reconcile(s,start+3*3600000,2*3600000);assert.equal(s.sessionMs,3*3600000);assert.equal(s.daily['2026-10-24'],30*60000);assert.equal(s.daily['2026-10-25'],150*60000);assert.equal(s.reminderDue,true);const same=c.reconcile(s,start+3*3600000,2*3600000);assert.equal(same.sessionMs,s.sessionMs);s.status='paused';assert.equal(c.reconcile(s,start+5*3600000,2*3600000).sessionMs,s.sessionMs);s.status='break';s.breakUntil=start+6*3600000;s=c.reconcile(s,start+7*3600000,2*3600000);assert.equal(s.status,'paused');assert.equal(s.breakReady,true);assert.equal(s.sessionMs,3*3600000);assert.equal(c.remaining(5000,4999),1000);assert.equal(c.remaining(5000,6000),0);assert.equal(c.duration(7322000),'02:02:02');
// Timestamp reconciliation across a long throttled/background gap, without tick counting.
let b=c.fresh();b.status='running';b.checkpoint=start;assert.equal(c.reconcile(b,start+125000,7200000).sessionMs,125000);assert.equal(c.reconcile(b,start-1000,7200000).sessionMs,0);console.log('Lock-in timestamp accounting, midnight split, pause/break exclusions, reminder threshold, no duplicate accrual, background gap, and countdown rounding passed.');

// Two calendar months, clamped at month-end, including leap years and year boundaries.
assert.equal(c.dayKey(c.historyStart(new Date(2026,3,30,12))),'2026-02-28');
assert.equal(c.dayKey(c.historyStart(new Date(2024,3,30,12))),'2024-02-29');
assert.equal(c.dayKey(c.historyStart(new Date(2026,0,15,12))),'2025-11-15');
const history={'2026-10-23':3600000,'2026-10-24':9000000};
assert.equal(c.studyDay(history,'2026-10-24').difference,5400000);
assert.equal(c.studyDay(history,'2026-10-25').difference,-9000000);
assert.equal(c.studyDay({},'2026-10-24').difference,0);
assert.equal(c.dayKey(c.studyDay({},'2026-01-01').previous),'2025-12-31');
console.log('Two-month history boundaries and selected-day comparisons passed.');

const original={...c.fresh(),daily:{'2026-10-24':3600000},sessionMs:3600000,status:'paused'};
const newSession=c.startSession(original,start);
assert.equal(newSession.startedAt,start);assert.equal(newSession.checkpoint,start);assert.equal(newSession.sessionMs,0);assert.equal(newSession.status,'running');assert.equal(newSession.daily['2026-10-24'],3600000);assert.equal(original.sessionMs,3600000);
const progressed=c.reconcile(newSession,start+60000,7200000);assert.equal(progressed.startedAt,start);assert.equal(progressed.sessionMs,60000);
progressed.status='paused';const paused=c.reconcile(progressed,start+120000,7200000);assert.equal(paused.startedAt,start);assert.equal(paused.sessionMs,60000);
console.log('New session resets timer, preserves history, and keeps its original start timestamp.');

const completed=c.endSession(progressed,start+180000);assert.equal(completed.previousSession.durationMs,60000);assert.equal(completed.previousSession.startedAt,start);assert.equal(completed.previousSession.endedAt,start+180000);assert.equal(completed.status,'idle');
const restarted=c.startSession(completed,start+200000);assert.equal(restarted.previousSession.durationMs,60000);assert.equal(restarted.sessionMs,0);assert.equal(restarted.daily['2026-10-24'],progressed.daily['2026-10-24']);
const replaced=c.startSession(progressed,start+300000);assert.equal(replaced.previousSession.durationMs,60000);
assert.equal(c.studyMilestone({'2026-10-23':3600000,'2026-10-24':5399999},new Date(2026,9,24)),false);
assert.equal(c.studyMilestone({'2026-10-23':3600000,'2026-10-24':5400000},new Date(2026,9,24)),true);
assert.equal(c.studyMilestone({},new Date(2026,9,24)),false);
console.log('Previous-session archive, restart preservation, and 30-minute milestone boundary passed.');
