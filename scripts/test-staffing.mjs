import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s.startsWith('./')&&!/\.(ts|js|mjs|tsx)$/.test(s)&&c.parentURL?.includes('/app/')?s+'.ts':s,c);}});
import {test} from 'node:test';import assert from 'node:assert/strict';import ExcelJS from 'exceljs';
const {seed,days,monday,generateSchedule,assignmentError,scheduleQuality}=await import('../app/domain.ts');
const {ensureStaffingWeek,saveStaffingNeeds,resetStaffingWeek,requirementsForDate,scheduleGaps,publishSchedule,validateStaffingWeek}=await import('../app/staffing.ts');
const {generateAuthorizedSchedule,manualAssignment,manualAssignmentWarnings,manualAssignmentBlocker}=await import('../app/scheduling-actions.ts');
const {newIdentity,resources,seal,decode,directory}=await import('../app/team-crypto.ts');
const {permits,permitsResourceWrite}=await import('../app/access.ts');
const {buildScheduleExport}=await import('../app/spreadsheet-export.ts');
const {saveEmployeeProfile}=await import('../app/employee-editor.ts');
const {restoreWorkingCopy}=await import('../app/working-copy.ts');
const {prepareOperationalExport}=await import('../app/operational-export.ts');
const allow=()=>true;
function fixture(){const s=seed();s.week='2026-10-05';s.schedule=[];s.availability=[];s.snapshots=[];s.employees=[{id:'one',name:'TEST One',department:'fo',position:'agent',qualifications:['agent'],hours:40,active:true},{id:'two',name:'TEST Two',department:'fo',position:'agent',qualifications:['agent'],hours:40,overnightOK:true,active:true}];s.reporting=[];s.config.staffing=[{id:'need',position:'agent',shift:'am',count:1}];return s;}
function counts(s,am=1){return Object.fromEntries(days(s.week).flatMap((d,i)=>s.config.shifts.map(sh=>[i+':'+sh.id,sh.id==='am'?am:0])));}
function form(fields={}){const f=new FormData();for(const[k,v]of Object.entries({employee:'one',date:'2026-10-05',shift:'am',position:'agent',...fields}))f.set(k,String(v));return f;}
test('daily targets aggregate old rules once and saved weekly demand stays independent of later property defaults',()=>{
 let s=fixture();s.config.staffing.push({id:'second',position:'agent',shift:'am',count:1});assert.equal(requirementsForDate(s,s.week)[0].count,2);assert.equal(generateSchedule(s,[s.week]).assignments.length,2);
 s=ensureStaffingWeek(s);const saved=structuredClone(s.staffingWeeks);s=saveStaffingNeeds(s,'agent',counts(s,3),'defaults',allow);assert.deepEqual(s.staffingWeeks,saved);assert.equal(requirementsForDate(s,s.week).find(r=>r.shift==='am').count,2);assert.equal(requirementsForDate(s,'2026-10-12').find(r=>r.shift==='am').count,3);
 const edited=counts(s,1);edited['1:am']=0;edited['2:mid']=2;s=saveStaffingNeeds(s,'agent',edited,'week',allow);assert.equal(requirementsForDate(s,'2026-10-06').find(r=>r.shift==='am').count,0);assert.equal(requirementsForDate(s,'2026-10-07').find(r=>r.shift==='mid').count,2);assert.equal(requirementsForDate(s,'2026-10-12').find(r=>r.shift==='am').count,3);
 s=resetStaffingWeek(s,allow);assert.equal(requirementsForDate(s,s.week).find(r=>r.shift==='am').count,3);
});
test('changed requirements draft publications, retain assignments and preserve published demand and times',()=>{
 let s=fixture();s.schedule=[manualAssignment(s,{id:''},form(),allow)];s=publishSchedule(s,allow,'2026-10-04T12:00:00Z');const history=structuredClone(s.snapshots),rows=structuredClone(s.schedule);
 s=saveStaffingNeeds(s,'agent',counts(s,0),'week',allow);assert.equal(s.published,false);assert.deepEqual(s.schedule,rows);assert.deepEqual(s.snapshots,history);assert.equal(history.find(r=>r.employee==='').requirements[0].count,1);
 assert.equal(scheduleGaps(s).length,0);assert.equal(scheduleQuality(s).coverage,100);
});
test('staffing input rejects invalid counts, dates, duplicates, references and unauthorized editors',()=>{
 const s=fixture();for(const bad of [-1,1.5,101,NaN])assert.throws(()=>saveStaffingNeeds(s,'agent',{...counts(s),'0:am':bad},'week',allow),/whole numbers/);
 assert.throws(()=>saveStaffingNeeds(s,'agent',counts(s),'defaults',()=>false),/authority/);assert.throws(()=>saveStaffingNeeds(s,'agent',counts(s),'week',(c,id)=>id==='one'),/authority/);
 for(const row of [{id:'2026-02-31',week:'2026-02-31',requirements:[]},{id:s.week,week:s.week,requirements:[{date:s.week,position:'bad',shift:'am',count:1}]},{id:s.week,week:s.week,requirements:Array(2).fill({date:s.week,position:'agent',shift:'am',count:1})}])assert.throws(()=>validateStaffingWeek(s,row));
});
test('overnight eligibility is explicit, not inferred from preference or shift name; custom times also enforce it',()=>{
 const s=fixture(),night=s.config.shifts.find(sh=>sh.id==='night');s.employees[0].preferred='night';s.config.staffing=[{id:'night',position:'agent',shift:'night',count:1}];night.name='TEST Renamed';
 const generated=generateSchedule(s,[s.week]);assert.equal(generated.assignments[0].employee,'two');assert.match(assignmentError(s,s.employees[0],s.week,night,'agent',[]),/overnight/);
 assert.throws(()=>manualAssignment(s,{id:''},form({shift:'night',overrideWarnings:'on',overrideReason:'TEST'}),allow),/overnight/);
 assert.throws(()=>manualAssignment(s,{id:''},form({customTimes:'on',start:'23:00',end:'07:00',hours:8}),allow),/overnight/);
 assert.equal(manualAssignment(s,{id:''},form({employee:'two',shift:'night'}),allow).employee,'two');
});
test('all manual warnings appear together, require deliberate evidence, and split consent removes only that warning',()=>{
 const s=fixture();s.config.maxWeeklyHours=24;s.config.overtimeHours=24;const worked=['2026-10-05','2026-10-06','2026-10-08'];s.schedule=worked.map((date,i)=>({id:'a'+i,employee:'one',date,shift:i===2?'pm':'am',position:'agent'}));const row={id:'new',employee:'one',date:'2026-10-09',shift:'am',position:'agent'};
 // Monday/Tuesday and Thursday worked; assigning Friday breaks Friday–Sunday's block into a weekend but does not create split days. Wednesday already isolated.
 const splitRow={...row,date:'2026-10-10'};const warnings=manualAssignmentWarnings(s,splitRow);assert.ok(warnings.some(w=>w.includes('overtime')));assert.ok(warnings.some(w=>w.includes('maximum')));assert.ok(warnings.some(w=>w.includes('splits days off')));
 const rest=manualAssignmentWarnings(s,row);assert.ok(rest.some(w=>w.includes('7.5 hours of rest')));
 assert.throws(()=>manualAssignment(s,{id:''},form({date:splitRow.date}),allow),/Review the warning/);const saved=manualAssignment(s,{id:''},form({date:splitRow.date,overrideWarnings:'on',overrideReason:'TEST manager decision'}),allow);assert.ok(saved.override.warnings.length>=3);
 s.employees[0].splitDaysOffOK=true;assert.ok(!manualAssignmentWarnings(s,splitRow).some(w=>w.includes('splits days off')));assert.ok(manualAssignmentWarnings(s,splitRow).some(w=>w.includes('overtime')));
});
test('rest checks include both neighboring weeks and blocking restrictions cannot be overridden',()=>{
 const s=fixture();s.schedule=[{id:'before',employee:'one',date:'2026-10-04',shift:'pm',position:'agent'},{id:'after',employee:'one',date:'2026-10-12',shift:'am',position:'agent'}];
 assert.ok(manualAssignmentWarnings(s,{id:'x',employee:'one',date:s.week,shift:'am',position:'agent'}).some(w=>w.includes('2026-10-04')&&w.includes('7.5')));
 assert.ok(manualAssignmentWarnings(s,{id:'x',employee:'one',date:'2026-10-11',shift:'pm',position:'agent'}).some(w=>w.includes('2026-10-12')));
 for(const setup of [()=>s.availability.push({id:'off',employee:'one',date:s.week}),()=>s.employees[0].qualifications=[],()=>s.schedule.push({id:'overlap',employee:'one',date:s.week,shift:'am',position:'agent'})]){const t=fixture();setup.call(null);assert.throws(()=>manualAssignment(s,{id:''},form({overrideWarnings:'on',overrideReason:'TEST'}),allow));s.availability=[];s.employees=t.employees;s.schedule=[];}
});
test('manager coverage fills exact demand, stays fixed during regeneration, supports multiple slots and never creates employees',()=>{
 let s=fixture();s.config.staffing[0].count=2;const before=structuredClone(s.employees),a=manualAssignment(s,{id:''},form({employee:'@manager'}),allow);s.schedule=[a];assert.equal(scheduleGaps(s,[s.week])[0].missing,1);
 const partial=generateAuthorizedSchedule(s,[s.week],allow);assert.ok(partial.next.schedule.some(r=>r.id===a.id));assert.equal(partial.result.coverage,100);assert.deepEqual(partial.next.employees,before);
 const b=manualAssignment(s,{id:''},form({employee:'@manager'}),allow);s.schedule.push(b);assert.equal(scheduleGaps(s,[s.week]).length,0);assert.throws(()=>manualAssignment(s,{id:''},form({employee:'@manager'}),(c,id)=>id==='one'),/authority/);
 s.employees=[];s.schedule=[];const empty=generateAuthorizedSchedule(s,[s.week],allow);assert.equal(empty.result.assignments.length,0);assert.ok(scheduleGaps(empty.next,[s.week]).length);
});
test('encrypted reopening preserves weekly needs, overnight flags, manager coverage and immutable publication contents',async()=>{
 let s=fixture();s=ensureStaffingWeek(s);s.schedule=[manualAssignment(s,{id:''},form({employee:'@manager'}),allow)];s=publishSchedule(s,allow);const identity=await newIdentity(),owner={userId:'owner',email:'test@example.invalid',employeeId:'',status:'active',grants:[{capability:'*',scope:{type:'property'}}],publicKey:identity.publicKey};const sealed=[];
 for(const p of resources(s,'owner'))sealed.push(await seal(p.value,identity,[owner],{id:p.id,field:p.field,subject:p.subject,revision:0,propertyId:'test'},directory(s)));
 const reopened=await decode(sealed,identity,'owner');assert.deepEqual(reopened.staffingWeeks,s.staffingWeeks);assert.equal(reopened.employees.find(e=>e.id==='two').overnightOK,true);assert.equal(reopened.schedule[0].coverage,'manager');assert.equal(reopened.snapshots.find(r=>r.employee==='').items[0].coverage,'manager');assert.deepEqual(reopened.snapshots.find(r=>r.employee==='').requirements,s.snapshots.find(r=>r.employee==='').requirements);
 const scoped={...owner,grants:[{capability:'Scheduling.Edit',scope:{type:'employees',ids:['one']}}]};assert.equal(permits(scoped,'Scheduling.Edit','',directory(s)),false);assert.equal(permitsResourceWrite(scoped,{field:'staffingWeeks',subject:''},undefined,directory(s)),false);assert.equal(permitsResourceWrite(owner,{field:'staffingWeeks',subject:''},undefined,directory(s)),true);
});
test('XLSX carries manager commitments and numeric daily demand; scoped exports omit shared staffing and manager entries',async()=>{
 let s=fixture();s=ensureStaffingWeek(s);s.schedule=[manualAssignment(s,{id:''},form({employee:'@manager',shift:'night'}),allow)];const book=new ExcelJS.Workbook();await book.xlsx.load((await buildScheduleExport(s)).bytes);assert.equal(book.getWorksheet('Shift details').getCell('B6').value,'Manager');assert.equal(book.getWorksheet('Shift details').getCell('H6').value.toISOString().slice(0,10),'2026-10-06');assert.equal(book.getWorksheet('Staffing needs').getCell('D6').value,1);assert.match(JSON.stringify(book.getWorksheet('Weekly schedule').getSheetValues()),/General coverage/);
 const member={userId:'x',employeeId:'one',status:'active',grants:['Scheduling.View','OperationalData.Export'].map(capability=>({capability,scope:{type:'employees',ids:['one']}}))};const scoped=prepareOperationalExport(s,member,'schedule');assert.equal(scoped.schedule.length,0);assert.deepEqual(scoped.staffingWeeks,[]);assert.deepEqual(scoped.config.staffing,[]);
});
test('removing overnight permission drafts future affected weeks without deleting shifts or altering historical publications',()=>{
 const s=fixture(),date=days(monday(new Date().toISOString().slice(0,10)),8)[7],week=monday(date),e=s.employees[1];s.schedule=[{id:'n',employee:e.id,date,shift:'night',position:'agent'}];s.publishedWeeks=[week];s.publications=[{id:e.id,employee:e.id,publishedWeeks:[week]}];s.snapshots=[{id:'old',type:'schedule',items:structuredClone(s.schedule)}];const f=form({name:e.name,department:'fo',position:'agent',active:'true',hours:40});const updated=saveEmployeeProfile(s,e,f,{scheduling:true,configuration:false});assert.equal(updated.employees[1].overnightOK,false);assert.deepEqual(updated.schedule,s.schedule);assert.deepEqual(updated.snapshots,s.snapshots);assert.ok(!updated.publishedWeeks.includes(week));
});
test('working copy restoration keeps saved staffing weeks and drafts changed targets while retaining history',()=>{
 const s=ensureStaffingWeek(fixture()),copy=structuredClone(s);s.publishedWeeks=[s.week];s.published=true;copy.staffingWeeks[0].requirements[0].count=3;const restored=restoreWorkingCopy(s,copy,'TEST');assert.equal(restored.staffingWeeks[0].requirements[0].count,3);assert.equal(restored.published,false);
});
test('incomplete time edits cannot crash warning rendering and returning to a template clears old custom values and overrides',()=>{
 const s=fixture();assert.equal(manualAssignmentBlocker(s,{id:'x',employee:'one',date:'',shift:'am',position:'agent'}),null);assert.equal(manualAssignmentBlocker(s,{id:'x',employee:'one',date:s.week,shift:'am',position:'agent',start:''}),null);
 const prior={id:'custom',employee:'one',date:s.week,shift:'am',position:'agent',start:'08:00',end:'16:00',hours:7,override:{reason:'old'}};s.schedule=[prior];const saved=manualAssignment(s,prior,form(),allow);assert.equal(saved.start,undefined);assert.equal(saved.hours,undefined);assert.equal(saved.override,undefined);
});
test('future unapproved overnight assignments block publication while historical copies remain intact',()=>{
 const s=fixture();s.week=monday(new Date().toISOString().slice(0,10));s.schedule=[{id:'bad',employee:'one',date:days(s.week)[6],shift:'night',position:'agent'}];assert.throws(()=>publishSchedule(s,allow),/not approved/);s.employees[0].overnightOK=true;assert.equal(publishSchedule(s,allow).published,true);
});
