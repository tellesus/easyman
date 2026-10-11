import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s.startsWith('./')&&!/\.(ts|js|mjs|tsx)$/.test(s)&&c.parentURL?.includes('/app/')?s+'.ts':s,c);}});
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {build} from 'esbuild';import {pathToFileURL} from 'node:url';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import ExcelJS from 'exceljs';
const {seed,days,generateSchedule,effectiveShift,assignmentError,scheduleQuality}=await import('../app/domain.ts');
const {generateAuthorizedSchedule,manualAssignment,manualAssignmentWarnings}=await import('../app/scheduling-actions.ts');
const {canExportOperational,prepareOperationalExport}=await import('../app/operational-export.ts');
const {saveRoomCheck,filterRoomChecks}=await import('../app/room-checks.ts');
const {personnelRecord}=await import('../app/personnel-editor.ts');
const {buildScheduleExport}=await import('../app/spreadsheet-export.ts');
function fixture(){const s=seed();s.week='2026-10-05';s.schedule=[];s.availability=[];s.employees=[{id:'one',name:'TEST Eight',position:'agent',qualifications:['agent'],hours:8,active:true,hire:'2020-01-01',splitDaysOffOK:true},{id:'two',name:'TEST Forty',position:'agent',qualifications:['agent'],hours:40,active:true,hire:'2021-01-01',splitDaysOffOK:true}];s.config.staffing=[{id:'need',position:'agent',shift:'am',count:1}];return s;}
function form(row={}){const f=new FormData();for(const [key,value]of Object.entries({employee:'one',position:'agent',date:'2026-10-05',shift:'am',...row}))f.set(key,String(value));return f;}
const allow=()=>true;
test('scoped full and partial generation counts protected coverage and retains assignments exactly once',()=>{
  const s=fixture(),protectedRow={id:'fixed',employee:'two',date:s.week,position:'agent',shift:'am',start:'06:00',end:'14:00',hours:7.5};s.config.maxWeeklyHours=56;s.schedule=[protectedRow,{id:'outside',employee:'one',date:'2026-10-12',position:'agent',shift:'am'}];
  const can=(c,id)=>id==='one';
  const selected=generateAuthorizedSchedule(s,[s.week],can);assert.equal(selected.result.coverage,100);assert.equal(selected.result.assignments.length,0);assert.deepEqual(selected.next.schedule,s.schedule);
  const full=generateAuthorizedSchedule(s,days(s.week),can);assert.deepEqual(full.next.schedule.find(a=>a.id==='fixed'),protectedRow);assert.equal(full.next.schedule.filter(a=>a.date===s.week).length,1);assert.equal(full.next.schedule.filter(a=>a.id==='outside').length,1);assert.equal(full.result.coverage,100);
  const editOnly=(c,id)=>c==='Scheduling.Edit'&&id==='two'||id==='one';const noAvailability=generateAuthorizedSchedule(s,[s.week],editOnly);assert.equal(noAvailability.result.assignments.length,0);
});
test('desired weekly hours determine feasible allocation instead of equal raw hours and unmet targets are explained',()=>{
  const s=fixture(),result=generateSchedule(s,days(s.week).slice(0,6)),hours=id=>result.assignments.filter(a=>a.employee===id).reduce((n,a)=>n+effectiveShift(s,a).hours,0);
  assert.equal(result.coverage,100);assert.equal(hours('one'),8);assert.equal(hours('two'),40);assert.deepEqual(result.hourWarnings,[]);
  const short=generateSchedule(s,[s.week]);assert.ok(short.hourWarnings.some(w=>w.includes('desired hours')));
  s.employees[0].hours=0;const zero=generateSchedule(s,[s.week]);assert.ok(zero.assignments.every(a=>a.employee==='two'));
});
test('manual weekly-limit overrides require acknowledgment and a reason, retain evidence and cannot bypass authority',()=>{
  const s=fixture();s.config.minRestHours=0;s.schedule=days(s.week).slice(0,5).map((date,i)=>({id:'a'+i,employee:'one',date,position:'agent',shift:'am'}));const f=form({date:days(s.week)[5]});
  assert.throws(()=>manualAssignment(s,{id:''},f,allow),/48 scheduled hours/);f.set('overrideWarnings','on');assert.throws(()=>manualAssignment(s,{id:''},f,allow),/reason/);f.set('overrideReason','TEST coverage override');const saved=manualAssignment(s,{id:''},f,allow);assert.equal(saved.override.reason,'TEST coverage override');assert.ok(saved.override.warnings[0].includes('40-hour'));
  assert.throws(()=>manualAssignment(s,{id:'old',employee:'two'},f,(c,id)=>id==='one'),/authority/);
  s.availability=[{id:'off',employee:'one',date:days(s.week)[5]}];assert.throws(()=>manualAssignment(s,{id:''},f,allow),/unavailable/);
});
test('custom manual times affect overlap, rest, weekly hours, summary and XLSX while preserving the template',async()=>{
  const s=fixture();s.employees[0].overnightOK=true;const template=structuredClone(s.config.shifts[0]),f=form({customTimes:'on',start:'23:00',end:'03:00',hours:'3.5'}),saved=manualAssignment(s,{id:''},f,allow);s.schedule=[saved];
  assert.deepEqual(s.config.shifts[0],template);assert.equal(effectiveShift(s,saved).hours,3.5);
  const next=form({date:'2026-10-06'});assert.throws(()=>manualAssignment(s,{id:''},next,allow),/11 hours/);next.set('overrideWarnings','on');next.set('overrideReason','TEST rest override');const overridden=manualAssignment(s,{id:''},next,allow);assert.ok(overridden.override.warnings.some(w=>w.includes('11 hours')));
  const overlap=form({date:'2026-10-06',customTimes:'on',start:'02:00',end:'10:00',hours:8,overrideWarnings:'on',overrideReason:'TEST'});assert.throws(()=>manualAssignment(s,{id:''},overlap,allow),/overlaps/);
  assert.ok(scheduleQuality({...s,schedule:[saved,overridden]}).constraintWarnings.some(w=>w.includes('11 hours')));
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load((await buildScheduleExport(s)).bytes);const detail=workbook.getWorksheet('Shift details');assert.equal(detail.getCell('J6').value,3.5);assert.equal(detail.getCell('G6').value.getUTCHours(),23);assert.equal(detail.getCell('H6').value.toISOString().slice(0,10),'2026-10-06');assert.equal(detail.getCell('I6').value.getUTCHours(),3);assert.match(workbook.getWorksheet('Weekly schedule').getCell('D6').value,/23:00–03:00/);
  for(const bad of [{start:'25:00'},{hours:'NaN'},{end:''}])assert.throws(()=>manualAssignment(s,{id:''},form({date:'2026-10-07',customTimes:'on',start:'07:00',end:'15:00',hours:8,...bad}),allow),/valid start/);
  assert.deepEqual(manualAssignmentWarnings(s,{...saved,start:''}),[]);assert.deepEqual(manualAssignmentWarnings(s,{...saved,hours:''}),[]);
});
test('operational exports enforce real capability plus module view and employee scope, including denied and disabled members',()=>{
  const s=fixture();s.schedule=[{id:'one',employee:'one',date:s.week,shift:'am',position:'agent'},{id:'two',employee:'two',date:s.week,shift:'am',position:'agent'}];s.boards=[{id:'b1',employee:'one',room:s.rooms[0].id},{id:'b2',employee:'two',room:s.rooms[1].id},{id:'unassigned',employee:'',room:s.rooms[2].id}];
  const member={userId:'test',employeeId:'one',status:'active',grants:[{capability:'Scheduling.View',scope:{type:'property'}},{capability:'HousekeepingBoards.View',scope:{type:'property'}}]};assert.equal(canExportOperational(s,member,'schedule'),false);assert.throws(()=>prepareOperationalExport(s,member,'schedule'),/export permission/);
  member.grants.push({capability:'OperationalData.Export',scope:{type:'employees',ids:['one']}});const schedule=prepareOperationalExport(s,member,'schedule'),board=prepareOperationalExport(s,member,'board');assert.deepEqual(schedule.schedule.map(a=>a.employee),['one']);assert.deepEqual(schedule.employees.map(e=>e.id),['one']);assert.deepEqual(board.boards.map(b=>b.id),['b1']);assert.deepEqual(board.rooms.map(r=>r.id),[s.rooms[0].id]);assert.equal(s.schedule.length,2);
  member.status='disabled';assert.equal(canExportOperational(s,member,'board'),false);member.status='active';member.grants=[{capability:'OperationalData.Export',scope:{type:'property'}}];assert.equal(canExportOperational(s,member,'schedule'),false);
});
test('inspection fields, separate rechecks and all original history filters preserve results across property-local date ranges',()=>{
  const s=seed();s.checks=[];const f=form({room:'201',inspector:'e11',attendant:'e8',result:'Fail',failureCategory:'Bathroom',notes:'TEST grout check',checkedAt:'2026-10-10T23:30'}),first=saveRoomCheck(s,f,undefined,allow),original=first.checks[0];assert.equal(original.attendant,'e8');assert.equal(original.failureCategory,'Bathroom');assert.equal(original.date,'2026-10-11T04:30:00.000Z');
  const recheck=form({room:'201',inspector:'e11',attendant:'e8',result:'Pass',notes:'TEST corrected',checkedAt:'2026-10-11T09:00'}),next=saveRoomCheck(first,recheck,original.id,allow);assert.equal(next.checks.length,2);assert.equal(next.checks[0].parent,original.id);assert.equal(next.checks[1].result,'Fail');assert.equal(next.checks[1].notes,original.notes);assert.equal(next.checks[1].status,'Rechecked');
  for(const filter of [{room:'201'},{inspector:'e11'},{attendant:'e8'},{category:'Bathroom'},{result:'Fail'},{from:'2026-10-10',to:'2026-10-10'},{search:'grout'}])assert.ok(filterRoomChecks(next,filter).some(c=>c.id===original.id));assert.equal(filterRoomChecks(next,{from:'2026-10-11',to:'2026-10-11'}).length,1);assert.equal(filterRoomChecks(next,{room:'999'}).length,0);
  assert.throws(()=>saveRoomCheck(first,recheck,original.id,()=>false),/inspection access/);assert.throws(()=>saveRoomCheck(first,form({room:'202',inspector:'e11',result:'Pass',notes:'TEST'}),original.id,allow),/original inspection/);
});
test('unrelated discipline revisions retain acknowledgment and the prior confidential version',()=>{
  const s=seed(),prior={id:'test',employee:'e2',subject:'TEST original',description:'TEST fictional',expected:'TEST expectation',acknowledgment:'Acknowledged',status:'Open',date:'2026-10-10',history:[]},f=form({subject:'TEST renamed',description:prior.description,expected:prior.expected,incidentAt:'2026-10-10T10:00',due:'2026-10-17'});
  const changed=personnelRecord(s,'discipline',prior,f,'TEST manager',allow);assert.equal(changed.acknowledgment,'Acknowledged');assert.equal(changed.history[0].snapshot.acknowledgment,'Acknowledged');f.set('acknowledgment','Declined');assert.equal(personnelRecord(s,'discipline',prior,f,'TEST manager',allow).acknowledgment,'Declined');
});
test('snapshot rendering exposes frozen operational details and notes without reading the later live directory',async()=>{
  const output='.sites-runtime/finish-snapshot-view.mjs';await build({entryPoints:['app/snapshot-view.tsx'],outfile:output,bundle:true,format:'esm',platform:'node',packages:'external',jsx:'automatic',logLevel:'silent'});const {default:SnapshotView}=await import(pathToFileURL(fs.realpathSync(output)));
  const snapshot={id:'snap',at:'2026-10-10T20:00:00.000Z',policy:{version:1,timezone:'America/Chicago'},items:[{id:'frozen',subject:'TEST handover',description:'TEST original description',status:'In progress',category:'Room Issue',room:'007',owner:'old-id',ownerName:'TEST Frozen Owner',priority:'Urgent',escalation:'Manager review',due:'2026-10-10T21:00:00.000Z',created:'2026-10-10T16:00:00.000Z',history:[{at:'2026-10-10T19:55:00.000Z',by:'TEST Shift lead',text:'TEST note needed for handover',action:'manager'}]}]};const before=structuredClone(snapshot),html=renderToStaticMarkup(createElement(SnapshotView,{snapshot,timezone:'UTC'}));for(const value of ['TEST handover','TEST original description','Room Issue','007','TEST Frozen Owner','Urgent','Manager review','Follow-up due','TEST Shift lead','TEST note needed for handover','America/Chicago'])assert.ok(html.includes(value),value);assert.ok(!html.includes('Edit record'));assert.deepEqual(snapshot,before);
});
