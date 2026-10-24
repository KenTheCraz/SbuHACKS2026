import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('web/calendar.js','utf8').split("let calendarView=")[0],ctx);const c=ctx.TaskCalendar;
assert.equal(c.parseDate('2026-02-30'),null);assert.equal(c.parseDate(''),null);assert.equal(c.parseDate('2028-02-29').getDate(),29);
for(const [y,m] of [[2026,9],[2028,1],[2026,11],[2027,0],[2026,2]]){const days=c.monthDays(y,m);assert.equal(days.length,42);assert.equal(new Set(days.map(d=>d.key)).size,42);assert.equal(c.parseDate(days[0].key).getDay(),0);assert.equal(days.filter(d=>d.inMonth).length,new Date(y,m+1,0).getDate());assert.ok(days.filter(d=>d.inMonth).every(d=>c.parseDate(d.key).getMonth()===m))}
assert.equal(c.dateKey(new Date(2026,9,24,12)),'2026-10-24');assert.ok(c.monthDays(2028,1).some(d=>d.key==='2028-02-29'));
console.log('Calendar month alignment, leap years, year boundaries, local date keys, and invalid dates passed.');
