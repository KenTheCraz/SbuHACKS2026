(function(root){
function courseStats(course,entries){const grades=entries.filter(e=>e.courseId===course.id),earned=grades.reduce((n,e)=>n+e.earned,0),possible=grades.reduce((n,e)=>n+e.possible,0),percent=possible?earned/possible*100:null;const points=course.points!==null?course.points:percent===null?null:percent>=90?4:percent>=80?3:percent>=70?2:percent>=60?1:0;return {earned,possible,percent,points,count:grades.length}}
function gpa(courses,entries){let total=0,credits=0;for(const course of courses){const stats=courseStats(course,entries);if(stats.points!==null&&course.credits>0){total+=stats.points*course.credits;credits+=course.credits}}return {value:credits?total/credits:null,credits}}
function validEntry(e){return typeof e.title==='string'&&!!e.title.trim()&&e.title.length<=500&&Number.isFinite(e.earned)&&e.earned>=0&&Number.isFinite(e.possible)&&e.possible>0}
root.GradesCore={courseStats,gpa,validEntry};
})(typeof window!=='undefined'?window:globalThis);
