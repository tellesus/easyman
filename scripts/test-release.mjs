import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return n(s.startsWith('./')&&!/\.(ts|js|mjs)$/.test(s)&&c.parentURL?.includes('/app/')?s+'.ts':s,c);}});
const {seed,generateSchedule,today,invalidateChangedShiftPublications,days}=await import('../app/domain.ts');
const {applyDaySetup,housekeepingDay,updateDayTask}=await import('../app/housekeeping.ts');
const {emptyState,resources,directory,newIdentity,seal,decode}=await import('../app/team-crypto.ts');
const {encryptBackup,decryptBackup}=await import('../app/vault.ts');
const {restoreWorkingCopy,validateWorkingCopy}=await import('../app/working-copy.ts');
const {APP_VERSION}=await import('../app/version.ts');
import fs from 'node:fs';
const password='TEST ONLY isolated backup passphrase';
function prepared(){const s=seed(),date=today(s.config.timezone);return {date,state:applyDaySetup(s,date,[{roomNumber:'201',service:'departure'},{roomNumber:'202',service:'stayover'}])};}

test('encrypted working-copy restoration keeps dated service, task identity, progress and history coherent',async()=>{
  const {date,state}=prepared();const backedUp=updateDayTask(state,date,'r0',{status:'Clean',locked:true});
  const encrypted={...await encryptBackup(backedUp,password),format:'easyman-workspace-copy-v1'};
  assert.ok(!JSON.stringify(encrypted).includes('Sofia Martinez'));
  await assert.rejects(()=>decryptBackup({...encrypted,format:'easyman-configuration-v1'},'wrong password'));
  const copy=await decryptBackup({...encrypted,format:'easyman-configuration-v1'},password);
  let current=applyDaySetup(state,date,[{roomNumber:'201',service:'departure'},{roomNumber:'202',service:'stayover'},{roomNumber:'203',service:'departure'}],true);
  current.boards=current.boards.map(b=>b.date===date&&b.room==='r0'?{...b,id:'recreated-task',status:'To clean',locked:false}:b);
  current.passon.push({id:'after-backup',subject:'TEST new item after backup',status:'Open'});
  const restored=restoreWorkingCopy(current,copy,'TEST manager'),view=housekeepingDay(restored,date);
  assert.equal(restored.boards.filter(b=>b.date===date&&b.room==='r0').length,1);
  assert.equal(view.boards.find(b=>b.room==='r0').status,'Clean');assert.equal(view.boards.find(b=>b.room==='r0').locked,true);
  assert.equal(view.rooms.find(r=>r.id==='r2').service,'none');assert.equal(view.boards.find(b=>b.room==='r2').active,false);
  assert.ok(restored.passon.some(p=>p.id==='after-backup'));
  const identity=await newIdentity(),member={userId:'owner',employeeId:'',email:'test@example.invalid',status:'active',grants:[{capability:'*',scope:{type:'property'}}],publicKey:identity.publicKey};
  const sealed=[];for(const p of resources(restored,'owner'))sealed.push(await seal(p.value,identity,[member],{id:p.id,field:p.field,subject:p.subject,revision:0,propertyId:'test'},directory(restored)));
  assert.equal(new Set(sealed.map(r=>r.id)).size,sealed.length);
  const reopened=await decode(sealed,identity,'owner');assert.equal(housekeepingDay(reopened,date).boards.find(b=>b.room==='r0').status,'Clean');assert.equal(housekeepingDay(reopened,date).rooms.find(r=>r.id==='r2').service,'none');
});
test('working-copy restoration preserves immutable published history and returns changed live schedules to draft',()=>{
  const s=seed(),snapshot={id:'TEST-publication',type:'schedule',week:s.week,items:structuredClone(s.schedule),shifts:structuredClone(s.config.shifts)};
  s.snapshots=[snapshot];s.published=true;s.publishedWeeks=[s.week];const copy=structuredClone(s);
  const current=structuredClone(s);current.config.shifts[0].start='08:00';current.schedule[0].shift='mid';
  copy.snapshots[0].shifts[0].start='09:00';
  const restored=restoreWorkingCopy(current,copy,'TEST manager');
  assert.deepEqual(restored.snapshots[0],snapshot);assert.equal(restored.published,false);assert.deepEqual(restored.publishedWeeks,[]);assert.deepEqual(restored.schedule,copy.schedule);assert.equal(restored.config.shifts[0].start,'07:00');
});
test('restored personnel content preserves the newer version as a revision',()=>{
  const s=seed(),copy=structuredClone(s);s.training[0].description='TEST newer coaching content';
  const restored=restoreWorkingCopy(s,copy,'TEST manager','2026-10-10T08:00:00.000Z');
  assert.equal(restored.training[0].description,copy.training[0].description);assert.equal(restored.training[0].history.at(-1).snapshot.description,'TEST newer coaching content');
});
test('legacy copies remain readable and malformed daily records are rejected before merging',()=>{
  const s=seed();validateWorkingCopy(s);assert.equal(restoreWorkingCopy(s,s,'TEST manager').boards.length,s.boards.length);
  for(const days of [{bad:true},[{id:'bad',date:'2026-02-31',items:[],catalog:[]}],[{id:'bad',date:'2026-10-10',items:[{room:'unknown',service:'departure'}],catalog:[]}]])assert.throws(()=>validateWorkingCopy({...s,housekeepingDays:days}),/housekeeping/);
  const duplicate={...s,boards:[s.boards[0],{...s.boards[0],id:'different-id'}]};assert.throws(()=>validateWorkingCopy(duplicate),/duplicate housekeeping task/);
});
test('an empty property can persist, reopen and prepare a zero-service day without seeded hotel records',async()=>{
  const s=emptyState();s.config.name='TEST empty property';s.config.sample=false;s.sample=false;
  assert.equal(s.rooms.length,0);assert.equal(s.employees.length,0);assert.equal(generateSchedule(s).coverage,0);
  const next=applyDaySetup(s,today(s.config.timezone),[]);assert.equal(next.boards.length,0);
  const identity=await newIdentity(),member={userId:'owner',employeeId:'',email:'test@example.invalid',status:'active',grants:[{capability:'*',scope:{type:'property'}}],publicKey:identity.publicKey};
  const sealed=[];for(const p of resources(next,'owner'))sealed.push(await seal(p.value,identity,[member],{id:p.id,field:p.field,subject:p.subject,revision:0,propertyId:'empty-test'},directory(next)));
  const reopened=await decode(sealed,identity,'owner');assert.equal(reopened.config.name,'TEST empty property');assert.equal(reopened.sample,false);assert.equal(reopened.rooms.length,0);assert.equal(reopened.passon.length,0);assert.equal(reopened.housekeepingDays.length,1);
});
test('release version matches package and lockfile metadata',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));assert.equal(APP_VERSION,'1.0.0');assert.equal(pkg.version,APP_VERSION);assert.equal(lock.version,APP_VERSION);assert.equal(lock.packages[''].version,APP_VERSION);
});

test('editing shift templates drafts only affected weeks while preserving immutable published copies',()=>{
  const s=seed();s.published=true;s.publishedWeeks=[s.week,days(s.week,8)[7]];s.publications=[{id:'e2',employee:'e2',publishedWeeks:[...s.publishedWeeks]}];s.schedule=[{id:'one',employee:'e2',date:s.week,shift:'am',position:'agent'},{id:'two',employee:'e2',date:days(s.week,8)[7],shift:'night',position:'agent'}];s.snapshots=[{id:'published',type:'schedule',week:s.week,items:structuredClone(s.schedule),shifts:structuredClone(s.config.shifts)}];
  const next=structuredClone(s);next.config.shifts.find(sh=>sh.id==='am').start='08:00';const result=invalidateChangedShiftPublications(s,next);
  assert.equal(result.published,false);assert.deepEqual(result.publishedWeeks,[days(s.week,8)[7]]);assert.deepEqual(result.publications[0].publishedWeeks,[days(s.week,8)[7]]);assert.deepEqual(result.snapshots,s.snapshots);assert.equal(result.snapshots[0].shifts.find(sh=>sh.id==='am').start,'07:00');assert.equal(s.published,true);
  const unrelated=structuredClone(s);unrelated.config.name='TEST changed hotel name';assert.equal(invalidateChangedShiftPublications(s,unrelated),unrelated);
});
test('time-zone changes draft affected published schedules, and unused shift additions do not',()=>{
  const s=seed();s.published=true;s.publishedWeeks=[s.week];const zoned=structuredClone(s);zoned.config.timezone='America/New_York';assert.equal(invalidateChangedShiftPublications(s,zoned).published,false);const extended=structuredClone(s);extended.config.shifts.push({id:'unused',name:'TEST unused',start:'09:00',end:'17:00',hours:8});assert.equal(invalidateChangedShiftPublications(s,extended),extended);
});
