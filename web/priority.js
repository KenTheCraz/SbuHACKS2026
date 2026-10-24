(function(root){
const rank={high:0,mid:1,low:2};
function suggest(description=''){
 const text=String(description).toLowerCase().replace(/[’]/g,"'");
 const clauses=text.split(/[.!?;\n]+/).filter(Boolean);
 const high=/\b(urgent|asap|critical|mandatory|required|high[- ]priority|must[- ]do|cannot miss|can't miss|due today|due tomorrow|deadline (?:today|tomorrow)|blocking|blocks? (?:the |our |my )?(?:team|launch|project)|final exam|major exam)\b|\b(?:worth|counts for)\s+(?:[2-9]\d|100)\s*%/;
 const low=/\b(optional|low[- ]priority|whenever|someday|no (?:rush|deadline)|nice[- ]to[- ]have|if (?:i |you |we )?(?:have|get) time|extra credit|not (?:urgent|important)|can wait)\b/;
 let urgent=clauses.some(c=>high.test(c.replace(/\b(?:not|isn't|is not|isn’t)\s+(?:very\s+)?(?:urgent|critical|mandatory|required|high[- ]priority)\b/g,'')));
 if(urgent)return {level:'high',reason:'Description mentions urgency, a requirement, a blocker, or major impact.'};
 if(clauses.some(c=>low.test(c)))return {level:'low',reason:'Description indicates this is optional, flexible, or can wait.'};
 return {level:'mid',reason:text.trim()?'No clear urgency or low-priority signal in the description.':'Add a description to get a more specific suggestion.'};
}
function effective(task){return Object.hasOwn(rank,task.priority)?task.priority:suggest(task.description).level}
function compare(a,b){return Number(!!a.done)-Number(!!b.done)||rank[effective(a)]-rank[effective(b)]||(a.date||'9999').localeCompare(b.date||'9999')}
root.TaskPriority={suggest,effective,compare};if(typeof module!=='undefined')module.exports=root.TaskPriority;
})(typeof window!=='undefined'?window:globalThis);
