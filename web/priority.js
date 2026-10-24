(function(root){
const rank={high:0,mid:1,low:2};
function suggest(description='',date='',now=new Date()){
 const text=String(description).toLowerCase().replace(/[’]/g,"'");
 const clauses=text.split(/[.!?;\n]+/).filter(Boolean);
 const high=/\b(urgent|asap|critical|mandatory|required|high[- ]priority|must[- ]do|cannot miss|can't miss|due today|due tomorrow|deadline (?:today|tomorrow)|blocking|blocks? (?:the |our |my )?(?:team|launch|project)|final exam|major exam)\b|\b(?:worth|counts for)\s+(?:[2-9]\d|100)\s*%/;
 const low=/\b(optional|low[- ]priority|whenever|someday|no (?:rush|deadline)|nice[- ]to[- ]have|if (?:i |you |we )?(?:have|get) time|extra credit|not (?:urgent|important)|can wait)\b/;
 let urgent=clauses.some(c=>high.test(c.replace(/\b(?:not|isn't|is not|isn’t)\s+(?:very\s+)?(?:urgent|critical|mandatory|required|high[- ]priority)\b/g,'')));
 const due=daysUntil(date,now);
 if(due!==null&&due<=2)return {level:'high',reason:due<0?'Overdue.':due===0?'Due today.':`Due in ${due} day${due===1?'':'s'}.`};
 if(urgent)return {level:'high',reason:'Description mentions urgency, a requirement, a blocker, or major impact.'};
 if(clauses.some(c=>low.test(c)))return {level:'low',reason:'Description indicates this is optional, flexible, or can wait.'};
 if(due!==null&&due<=7)return {level:'mid',reason:`Due in ${due} days, with no urgent description signals.`};
 return {level:'low',reason:due!==null?`Due in ${due} days, with no urgent description signals.`:'No near deadline or urgent description signals.'};
}
function daysUntil(date,now){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;const [y,m,d]=date.split('-').map(Number);const check=new Date(y,m-1,d);if(check.getFullYear()!==y||check.getMonth()!==m-1||check.getDate()!==d)return null;return Math.round((Date.UTC(y,m-1,d)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000)}
function effective(task){return Object.hasOwn(rank,task.priority)?task.priority:suggest(task.description,task.date).level}
function compare(a,b){return Number(!!a.done)-Number(!!b.done)||rank[effective(a)]-rank[effective(b)]||(a.date||'9999').localeCompare(b.date||'9999')}
root.TaskPriority={suggest,effective,compare};if(typeof module!=='undefined')module.exports=root.TaskPriority;
})(typeof window!=='undefined'?window:globalThis);
