import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
registerHooks({resolve(s,c,n){return n(s.startsWith('./')&&!/\.(ts|js|mjs)$/.test(s)&&c.parentURL?.includes('/app/')?s+'.ts':s,c);}});
const {createDemoState,createDemoRuntime,demoExampleFiles}=await import('../app/demo-state.ts');
const {today}=await import('../app/domain.ts');
const {housekeepingDay,parseDayImport,dayImportProblems}=await import('../app/housekeeping.ts');
const {buildScheduleExport,buildRoomBoardExport}=await import('../app/spreadsheet-export.ts');
const {buildDemo,DEMO_CSP}=await import('./build-demo.mjs');
import ExcelJS from 'exceljs';

test('demo state loads and changes without reading or writing any storage or network API; tabs and resets are independent',()=>{
  const saved=new Map();let attempts=0;
  for(const name of ['indexedDB','localStorage','sessionStorage','fetch']){saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,get(){attempts++;throw Error('Persistent access');}});}
  try{const a=createDemoRuntime(),b=createDemoRuntime(),first=a.load(),other=b.load();first.config.name='TEST temporary name';first.passon[0].status='Completed';a.save(first);assert.equal(a.read().config.name,'TEST temporary name');assert.equal(b.read().config.name,other.config.name);assert.equal(createDemoRuntime().load().config.name,other.config.name);const copy=a.read();copy.config.name='Not saved';assert.equal(a.read().config.name,'TEST temporary name');assert.equal(attempts,0);}finally{for(const [name,desc] of saved)if(desc)Object.defineProperty(globalThis,name,desc);else delete globalThis[name];}
});
test('fictional demo starts with a current populated schedule, dated housekeeping roster and usable inspection/personnel records',()=>{
  const s=createDemoState(),day=today(s.config.timezone),board=housekeepingDay(s,day);assert.ok(s.schedule.some(a=>a.date===day));assert.deepEqual(s.housekeepingDays.find(d=>d.date===day).attendantIds,['e8','e9','e10']);assert.ok(board.boards.length>0);assert.ok(board.rooms.some(r=>r.number==='007'));assert.ok(board.rooms.some(r=>r.flag==='DND'));assert.ok(s.checks.every(c=>c.attendant&&c.date.endsWith('Z')));assert.equal(s.discipline[0].acknowledgment,'Acknowledged');assert.equal(s.employees.find(e=>e.id==='e5').splitDaysOffOK,true);
});
test('fictional snapshot uses the real completion cutoff, has frozen notes and makes no automatic capture claim',()=>{
  const s=createDemoState(),snapshot=s.snapshots[0];assert.equal(snapshot.demo,true);assert.equal(snapshot.automatic,false);assert.ok(!snapshot.items.some(p=>p.id==='demo-older-completed'));assert.ok(snapshot.items.some(p=>p.id==='p5'));const live=s.passon[0],frozen=snapshot.items.find(p=>p.id===live.id);assert.ok(live.history.length>frozen.history.length);live.history[0].text='TEST later edit';assert.notEqual(frozen.history[0].text,live.history[0].text);
});
test('provided fictional PMS files validate against the current catalog and the mapping example requires review',()=>{
  const s=createDemoState(),date=today(s.config.timezone),files=demoExampleFiles(s,date),valid=parseDayImport(files.json,date),invalid=parseDayImport(files.invalidJson,date);assert.equal(dayImportProblems(valid.rooms,s).length,0);assert.ok(dayImportProblems([...invalid.rooms,...invalid.unmatched],s).some(e=>e.includes('unknown room')));assert.ok(files.report.includes(date));assert.throws(()=>parseDayImport(files.json,'2001-01-01'),/date must match/);
});
test('demo exports are actual XLSX files with fictional property data, numeric hours and portrait attendant handouts',async()=>{
  const s=createDemoState(),schedule=await buildScheduleExport(s),board=await buildRoomBoardExport(housekeepingDay(s,today(s.config.timezone))),a=new ExcelJS.Workbook(),b=new ExcelJS.Workbook();await a.xlsx.load(schedule.bytes);await b.xlsx.load(board.bytes);assert.ok(a.worksheets.length>=2);assert.ok(JSON.stringify(a.worksheets[0].getSheetValues()).includes('Demo'));assert.ok(b.worksheets.some(w=>w.pageSetup.orientation==='portrait'));assert.ok(JSON.stringify(b.worksheets.map(w=>w.getSheetValues())).includes('007'));
});
test('standalone bundle excludes live storage, account and server modules and restricts browser connections',async()=>{
  const output=path.resolve('.sites-runtime/demo-test-build');await buildDemo({outdir:output});const meta=JSON.parse(fs.readFileSync(path.join(output,'build-manifest.json'),'utf8')),html=fs.readFileSync(path.join(output,'index.html'),'utf8');assert.ok(DEMO_CSP.includes("connect-src 'none'"));assert.ok(html.includes(DEMO_CSP));assert.equal(meta.probe,false);assert.ok(!meta.inputs.some(p=>/app\/(vault|team-client|team-panel|team-server|chatgpt-auth)\.(ts|tsx)$/.test(p)));assert.ok(!meta.inputs.some(p=>p.startsWith('app/api/')));assert.ok(meta.inputs.some(p=>p==='demo/demo-vault.ts'));
});
