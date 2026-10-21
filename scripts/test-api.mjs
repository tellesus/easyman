import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync,readdirSync,mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { build } from 'esbuild';
registerHooks({resolve(specifier,context,next){return next(specifier.startsWith('./')&&!/\.(ts|js|mjs)$/.test(specifier)&&context.parentURL?.includes('/app/')?specifier+'.ts':specifier,context);}});
const {newIdentity,seal,rewrap,openResource,emptyState,resources,directory,decode}=await import('../app/team-crypto.ts');
const {lockLoginKey,unlockLoginKey,randomToken,passwordDigest,validPassword}=await import('../app/password-crypto.ts');
const {staffGrants}=await import('../app/access.ts');
const {seed,today}=await import('../app/domain.ts');
const {applyDaySetup,housekeepingDay,updateDayTask}=await import('../app/housekeeping.ts');
const {restoreWorkingCopy}=await import('../app/working-copy.ts');
const {encryptBackup,decryptBackup,encrypt}=await import('../app/vault.ts');
const {profileGrants}=await import('../app/access.ts');
const {ensureStaffingWeek,publishSchedule}=await import('../app/staffing.ts');
const {manualAssignment}=await import('../app/scheduling-actions.ts');
const sql=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement{constructor(query,params=[]){this.query=query;this.params=params;}bind(...params){return new Statement(this.query,params);}async first(){return sql.prepare(this.query).get(...this.params)||null;}async all(){return {results:sql.prepare(this.query).all(...this.params)};}async run(){const result=sql.prepare(this.query).run(...this.params);return {success:true,meta:{changes:Number(result.changes)}};}}
globalThis.__easymanHeaders=new AsyncLocalStorage();
globalThis.__easymanDb={prepare:q=>new Statement(q),batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const out=path.resolve('.sites-runtime/api-tests');mkdirSync(out,{recursive:true});
const names=['account','team-workspace','team','keys','recovery','session-reset','snapshots','snapshot-status','workspace','audit','sessions','feedback','mcp'];const routes={};
for(const name of names){const file=path.join(out,name+'.mjs');await build({entryPoints:[name==='mcp'?'app/mcp/route.ts':'app/api/'+name+'/route.ts'],outfile:file,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'test-platform-boundary',setup(b){b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='cloudflare:workers'?'export const env={DB:globalThis.__easymanDb};':a.path==='next/headers'?'export async function headers(){return globalThis.__easymanHeaders.getStore()||new Headers();}':'export function redirect(){throw new Error("Redirect in API test");}'}));}}]});routes[name]=await import(pathToFileURL(file));}
const snapshotFile=path.join(out,'snapshot-service.mjs');await build({entryPoints:['app/snapshot-server.ts'],outfile:snapshotFile,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'test-snapshot-platform',setup(b){b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='cloudflare:workers'?'export const env={DB:globalThis.__easymanDb};':a.path==='next/headers'?'export async function headers(){return new Headers();}':'export function redirect(){}'}));}}]});const {captureDueSnapshots,propertySnapshotStatus}=await import(pathToFileURL(snapshotFile));
const cookies=new Map();
test('new weekly needs and manager coverage persist through real encrypted API; scoped edits and historical rewrites are denied',async()=>{
  const f=await editingFixture('staffing-api');let state=ensureStaffingWeek(f.state);state.employees[1].overnightOK=true;
  const form=new FormData();for(const [k,v]of Object.entries({employee:'@manager',date:state.week,shift:'night',position:'agent'}))form.set(k,v);state.schedule.push(manualAssignment(state,{id:''},form,()=>true));state=publishSchedule(state,()=>true);
  const context=(await call(f.owner,'team-workspace')).value,records=[];for(const item of resources(state,f.owner)){const previous=context.resources.find(r=>r.id===item.id);if(previous&&['scheduleArchives','snapshots'].includes(item.field))continue;records.push(await seal(item.value,f.identity,context.members,{id:item.id,field:item.field,subject:item.subject,propertyId:f.owner,revision:previous?.revision||0},f.dir));}
  const result=await call(f.owner,'team-workspace','PUT',{propertyId:f.owner,revision:context.revision,records,deleted:[]});assert.equal(result.status,200,JSON.stringify(result.value));
  const reopenedContext=(await call(f.owner,'team-workspace')).value,reopened=await decode(reopenedContext.resources,f.identity,f.owner);assert.deepEqual(reopened.staffingWeeks,state.staffingWeeks);assert.ok(reopened.schedule.some(a=>a.coverage==='manager'&&a.employee===''));assert.equal(reopened.employees.find(e=>e.id==='e2').overnightOK,true);assert.ok(reopened.snapshots.some(r=>r.requirements&&r.items.some(a=>a.coverage==='manager')));
  const archived=reopenedContext.resources.find(r=>r.field==='scheduleArchives'&&r.subject===''),altered=await seal({id:'TEST changed',type:'schedule',items:[]},f.identity,reopenedContext.members,{...archived},f.dir);assert.equal((await call(f.owner,'team-workspace','PUT',{propertyId:f.owner,revision:reopenedContext.revision,records:[altered],deleted:[]})).status,403);
  const grants=['Scheduling.Edit','Scheduling.View','Availability.View'].map(capability=>({capability,scope:{type:'employees',ids:['e2']}}));sql.prepare('UPDATE members SET grants=? WHERE property=? AND user_id=?').run(JSON.stringify(grants),f.owner,f.editor);
  const scoped=(await call(f.editor,'team-workspace','GET',undefined,'?property='+f.owner)).value;assert.ok(!scoped.resources.some(r=>r.field==='staffingWeeks'||r.field==='schedule'&&r.subject===''));
  const needs=records.find(r=>r.field==='staffingWeeks'),manager=records.find(r=>r.field==='schedule'&&r.subject==='');for(const record of [needs,manager])assert.equal((await call(f.editor,'team-workspace','PUT',{propertyId:f.owner,revision:scoped.revision,records:[record],deleted:[]})).status,403);
});
test('completed scheduling and inspection fields persist encrypted through actual storage and survive readback',async()=>{
  const actor='finish-workflows',identity=await newIdentity(),state=seed();state.schedule=[{id:'adjusted',employee:'e2',position:'agent',date:'2026-10-12',shift:'am',start:'08:00',end:'16:00',hours:7.5,override:{warnings:['TEST warning'],reason:'TEST explicit override',at:'2026-10-10T20:00:00Z'}}];state.checks=[{id:'inspected',room:'007',inspector:'e11',attendant:'e8',failureCategory:'Bathroom',result:'Fail',notes:'TEST inspection',date:'2026-10-10T20:00:00Z',status:'Recheck required'}];state.discipline=[{id:'discipline',employee:'e2',subject:'TEST fiction',acknowledgment:'Declined',history:[{at:'2026-10-10T20:00:00Z',text:'TEST previous version',snapshot:{acknowledgment:'Acknowledged'}}]}];state.passon=[{id:'frozen-details',owner:'e2',ownerName:'TEST Frozen Owner',subject:'TEST handover',status:'Open',priority:'Urgent',escalation:'Manager review',history:[{at:'2026-10-10T20:00:00Z',by:'TEST manager',text:'TEST frozen operational note'}]}];
  await call(actor,'team-workspace');await call(actor,'team-workspace','POST',{action:'identity',publicKey:identity.publicKey});await bootstrapProperty(actor,{directory:directory(state),timezone:'America/Chicago',boundaries:[]});const context=(await call(actor,'team-workspace')).value,encrypted=[];
  for(const p of resources(state,actor))encrypted.push(await seal(p.value,identity,context.members,{id:p.id,field:p.field,subject:p.subject,revision:0,propertyId:actor},directory(state)));
  assert.ok(!JSON.stringify(encrypted).includes('TEST Frozen Owner'));assert.equal((await call(actor,'team-workspace','PUT',{propertyId:actor,revision:context.revision,records:encrypted,deleted:[],directory:directory(state)})).status,200);
  const loaded=await decode((await call(actor,'team-workspace')).value.resources,identity,actor);assert.deepEqual(loaded.schedule,state.schedule);assert.deepEqual(loaded.checks,state.checks);assert.deepEqual(loaded.discipline,state.discipline);assert.deepEqual(loaded.passon,state.passon);
});
test('API persists pass-on expiry and unchanged legacy records upgrade without changing completion time',async()=>{
  const actor='cutoff-api',identity=await newIdentity(),dir={employees:[],reporting:[]};
  await call(actor,'team-workspace');await call(actor,'team-workspace','POST',{action:'identity',publicKey:identity.publicKey});
  await bootstrapProperty(actor,{directory:dir,timezone:'America/Chicago',boundaries:['07:00']});
  const context=(await call(actor,'team-workspace')).value;
  const value={id:'one',subject:'SYNTHETIC completed',status:'Completed',completed:'2026-10-10T00:00:00.000Z',history:[]};
  const record=await seal(value,identity,context.members,{id:'passon:one',propertyId:actor,field:'passon',subject:'',revision:0},dir);
  for(const invalid of [{...record,snapshotExcludeAfter:'2026-02-31T00:00:00.000Z'},{...record,snapshotExcludeAfter:'bad'},{...record,aadVersion:1},{...record,field:'boards',id:'boards:one'}])assert.equal((await call(actor,'team-workspace','PUT',{propertyId:actor,revision:context.revision,records:[invalid],deleted:[]})).status,400);
  // Construct a real old AAD-v1 ciphertext, then exercise the normal unchanged save upgrade.
  const dataKey=await crypto.subtle.unwrapKey('raw',Buffer.from(record.wrapped[actor],'base64'),identity.privateKey,{name:'RSA-OAEP'},'AES-GCM',true,['encrypt']);
  const legacy={...record,...await encrypt(value,dataKey,JSON.stringify([actor,record.id,record.field,record.subject])),aadVersion:1};delete legacy.snapshotExcludeAfter;
  assert.equal((await call(actor,'team-workspace','PUT',{propertyId:actor,revision:context.revision,records:[legacy],deleted:[]})).status,200);
  const fresh=(await call(actor,'team-workspace')).value,decoded=await decode(fresh.resources,identity,actor);assert.deepEqual(decoded.passon[0],value);
  const clientFile=path.join(out,'team-client.mjs');await build({entryPoints:['app/team-client.ts'],outfile:clientFile,bundle:true,format:'esm',platform:'node',logLevel:'silent'});const {saveTeam}=await import(pathToFileURL(clientFile));
  const teamContext={propertyId:actor,revision:fresh.revision,keyEpoch:fresh.keyEpoch,member:fresh.member,members:fresh.members,directory:fresh.directory,identity,known:new Map([[legacy.id,{resource:legacy,value:JSON.stringify(value)}]])};
  const priorFetch=globalThis.fetch;
  globalThis.fetch=async(url,options={})=>{const parsed=new URL(url,'https://easyman.test'),method=options.method||'GET',data=options.body?JSON.parse(options.body):undefined;const result=await call(actor,'team-workspace',method,data,parsed.search);return Response.json(result.value,{status:result.status});};
  try{await saveTeam(decoded,teamContext,actor);}finally{globalThis.fetch=priorFetch;}
  const stored=(await call(actor,'team-workspace')).value.resources.find(r=>r.id==='passon:one');assert.equal(stored.aadVersion,2);assert.equal(stored.snapshotExcludeAfter,'2026-10-10T12:00:00.000Z');assert.deepEqual(await openResource(stored,identity,actor),value);
  const historical=JSON.parse(sql.prepare('SELECT data FROM resource_versions WHERE property=? AND resource_id=? ORDER BY timestamp DESC LIMIT 1').get(actor,actor+'::passon:one').data);assert.equal(historical.aadVersion,1);assert.deepEqual(await openResource(historical,identity,actor),value);
});
async function call(actor,route,method='GET',data,query=''){
  const headers=new Headers({'Origin':'https://easyman.test','Content-Type':'application/json','cf-connecting-ip':actor||'anonymous-test'});
  if(cookies.has(actor))headers.set('Cookie',cookies.get(actor));
  const auth=new Headers(headers);if(actor&&!actor.startsWith('browser:')){auth.set('oai-authenticated-user-id',actor);auth.set('oai-authenticated-user-email',actor+'@example.invalid');}
  const request=new Request('https://easyman.test/api/'+route+query,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})});
  const response=await globalThis.__easymanHeaders.run(auth,()=>routes[route][method](request));
  for(const cookie of response.headers.getSetCookie()){const name=cookie.split('=')[0];const prior=(cookies.get(actor)||'').split('; ').filter(c=>c&&!c.startsWith(name+'='));cookies.set(actor,[...prior,...(/Max-Age=0(?:;|$)/.test(cookie)?[]:[cookie.split(';')[0]])].join('; '));}
  const value=await response.json();return {status:response.status,value,headers:response.headers};
}

async function editingFixture(prefix){
  const owner=prefix+'-owner',editor=prefix+'-editor',identity=await newIdentity(),editorIdentity=await newIdentity();
  for(const [actor,key] of [[owner,identity],[editor,editorIdentity]]){await call(actor,'team-workspace');assert.equal((await call(actor,'team-workspace','POST',{action:'identity',publicKey:key.publicKey})).status,200);}
  const state=emptyState();state.config.sample=false;state.employees=seed().employees.slice(0,2);state.reporting=[{id:'reporting-one',employee:'e2',targetType:'employee',target:'e1'}];state.availability=[{id:'restricted',employee:'e2',from:'2026-10-05',to:'2026-10-12',shift:'pm'}];state.schedule=[{id:'shift',employee:'e1',date:'2026-10-05',position:'agent',shift:'am'}];state.publications=[{id:'e1',employee:'e1',publishedWeeks:['2026-10-05','2026-10-12']},{id:'e2',employee:'e2',publishedWeeks:[]}];
  state.snapshots=[{id:'published-copy',employee:'e1',type:'schedule',week:'2026-10-05',items:structuredClone(state.schedule),shifts:state.config.shifts,at:'2026-10-04T18:00:00.000Z'}];
  const dir=directory(state);assert.equal((await bootstrapProperty(owner,{directory:dir,timezone:state.config.timezone,boundaries:state.config.boundaries})).status,200);
  const grants=['Property.View','Employees.View','Rooms.View','Scheduling.View','Scheduling.Edit','Availability.View','Employees.Manage'].map(capability=>({capability,scope:{type:'property'}}));
  sql.prepare("INSERT INTO members (id,property,user_id,email,employee_id,status,grants,created_at) VALUES (?,?,?,?,?,'active',?,?)").run(owner+'::'+editor,owner,editor,editor+'@example.invalid','e2',JSON.stringify(grants),new Date().toISOString());
  let context=(await call(owner,'team-workspace')).value;const records=[];for(const item of resources(state,owner))records.push(await seal(item.value,identity,context.members,{...item,propertyId:owner,revision:0},dir));
  assert.equal((await call(owner,'team-workspace','PUT',{propertyId:owner,revision:context.revision,records,deleted:[]})).status,200);
  context=(await call(editor,'team-workspace','GET',undefined,'?property='+owner)).value;
  return {owner,editor,identity,editorIdentity,state,dir,context};
}

test('shift reassignment saves through actual API, preserves old scope and requires both scopes',async()=>{
  const f=await editingFixture('assignment-fix');let context=f.context;
  const prior=context.resources.find(row=>row.id==='schedule:shift');
  const changed=await seal({...f.state.schedule[0],employee:'e2'},f.editorIdentity,context.members,{id:prior.id,field:'schedule',subject:'e2',revision:prior.revision,propertyId:f.owner},f.dir);
  assert.equal((await call(f.editor,'team-workspace','PUT',{propertyId:f.owner,revision:context.revision,records:[changed],deleted:[]})).status,200);
  context=(await call(f.owner,'team-workspace')).value;const stored=context.resources.find(row=>row.id===prior.id);assert.equal(stored.subject,'e2');assert.equal((await openResource(stored,f.identity,f.owner)).employee,'e2');
  const versions=sql.prepare('SELECT data FROM resource_versions WHERE property=? AND resource_id=?').all(f.owner,f.owner+'::'+prior.id).map(row=>JSON.parse(row.data));assert.equal(versions.length,1);assert.equal(versions[0].subject,'e1');assert.equal((await openResource(versions[0],f.identity,f.owner)).employee,'e1');
  for(const employee of ['e1','e2']){
    const grants=['Scheduling.View','Scheduling.Edit'].map(capability=>({capability,scope:{type:'employees',ids:[employee]}}));sql.prepare('UPDATE members SET grants=? WHERE property=? AND user_id=?').run(JSON.stringify(grants),f.owner,f.editor);
    const movedBack=await seal({...f.state.schedule[0]},f.identity,context.members,{id:prior.id,field:'schedule',subject:'e1',revision:stored.revision,propertyId:f.owner},f.dir);
    assert.equal((await call(f.editor,'team-workspace','PUT',{propertyId:f.owner,revision:context.revision,records:[movedBack],deleted:[]})).status,403);
  }
  assert.equal(sql.prepare('SELECT subject FROM encrypted_resources WHERE id=?').get(f.owner+'::'+prior.id).subject,'e2');
});

test('narrow editors save employee and draft changes but cannot publish or alter metadata',async()=>{
  const f=await editingFixture('narrow-edit-fix'),state=await decode(f.context.resources,f.editorIdentity,f.editor);
  const beforeReporting=structuredClone(state.reporting),beforeAvailability=structuredClone(state.availability);
  state.employees.find(row=>row.id==='e2').name='TEST renamed without configuration grant';state.schedule[0].date='2026-10-06';state.publications.find(row=>row.employee==='e1').publishedWeeks=['2026-10-12'];
  const clientFile=path.join(out,'editing-client.mjs');await build({entryPoints:['app/team-client.ts'],outfile:clientFile,bundle:true,format:'esm',platform:'node',logLevel:'silent'});const {saveTeam}=await import(pathToFileURL(clientFile));
  const context={...f.context,identity:f.editorIdentity,known:new Map(resources(await decode(f.context.resources,f.editorIdentity,f.editor),f.editor).map(item=>[item.id,{resource:f.context.resources.find(r=>r.id===item.id),value:JSON.stringify(item.value)}]))};
  const priorFetch=globalThis.fetch;globalThis.fetch=async(url,options={})=>{const parsed=new URL(url,'https://easyman.test'),result=await call(f.editor,'team-workspace',options.method||'GET',options.body?JSON.parse(options.body):undefined,parsed.search);return Response.json(result.value,{status:result.status});};
  try{await saveTeam(state,context,f.editor);}finally{globalThis.fetch=priorFetch;}
  const remote=(await call(f.editor,'team-workspace','GET',undefined,'?property='+f.owner)).value,restored=await decode(remote.resources,f.editorIdentity,f.editor);
  assert.equal(restored.employees.find(row=>row.id==='e2').name,'TEST renamed without configuration grant');assert.deepEqual(restored.reporting,beforeReporting);assert.deepEqual(restored.availability,beforeAvailability);assert.equal(restored.schedule[0].date,'2026-10-06');assert.deepEqual(restored.publications.find(row=>row.employee==='e1').publishedWeeks,['2026-10-12']);assert.deepEqual(restored.snapshots[0].items,f.state.snapshots[0].items);
  const resource=remote.resources.find(row=>row.id==='publication:e1'),malicious=await seal({id:'e1',employee:'e1',publishedWeeks:['2026-10-05','2026-10-12']},f.editorIdentity,remote.members,{id:resource.id,field:'publication',subject:'e1',revision:resource.revision,propertyId:f.owner},f.dir);
  assert.equal((await call(f.editor,'team-workspace','PUT',{propertyId:f.owner,revision:remote.revision,records:[malicious],deleted:[]})).status,403);
  await assert.rejects(()=>openResource({...resource,publicationWeeks:['2026-10-05']},f.editorIdentity,f.editor));
  const smuggled=await seal({id:'e1',employee:'e1',publishedWeeks:[]},f.editorIdentity,remote.members,{id:resource.id,field:'publication',subject:'e1',revision:resource.revision,propertyId:f.owner},f.dir);
  // Encrypt a contradictory payload under authenticated empty metadata. Readers
  // must use authenticated weeks, so this cannot turn an edit grant into Publish.
  const key=await crypto.subtle.unwrapKey('raw',Buffer.from(smuggled.wrapped[f.editor],'base64'),f.editorIdentity.privateKey,{name:'RSA-OAEP'},'AES-GCM',true,['encrypt']);
  Object.assign(smuggled,await encrypt({id:'e1',employee:'e1',publishedWeeks:['2026-10-05']},key,JSON.stringify([f.owner,smuggled.id,smuggled.field,smuggled.subject,[]])));
  assert.equal((await call(f.editor,'team-workspace','PUT',{propertyId:f.owner,revision:remote.revision,records:[smuggled],deleted:[]})).status,200);
  const final=(await call(f.editor,'team-workspace','GET',undefined,'?property='+f.owner)).value;assert.deepEqual((await decode(final.resources,f.editorIdentity,f.editor)).publications.find(row=>row.employee==='e1').publishedWeeks,[]);
});

test('revoked administrator sessions cannot list or approve recovery; bootstrap remains usable',async()=>{
  const f=await editingFixture('recovery-session-fix'),replacement=await newIdentity();
  const original=sql.prepare('SELECT public_key FROM identities WHERE user_id=?').get(f.editor).public_key;
  assert.equal((await call(f.editor,'recovery','POST',{action:'request',propertyId:f.owner,publicKey:replacement.publicKey})).status,200);
  const ticket=sql.prepare("SELECT * FROM account_recovery WHERE property=? AND status='requested'").get(f.owner);
  assert.equal((await call(f.owner,'recovery','POST',{action:'unexpected',propertyId:f.owner,id:ticket.id})).status,400);
  sql.prepare('UPDATE app_sessions SET revoked=1 WHERE property=? AND user_id=?').run(f.owner,f.owner);
  assert.equal((await call(f.owner,'recovery','GET',undefined,'?property='+f.owner)).status,401);
  assert.equal((await call(f.owner,'recovery','POST',{action:'approve',propertyId:f.owner,id:ticket.id})).status,401);
  assert.equal(sql.prepare('SELECT status FROM account_recovery WHERE id=?').get(ticket.id).status,'requested');assert.equal(sql.prepare('SELECT public_key FROM identities WHERE user_id=?').get(f.editor).public_key,original);
  sql.prepare('UPDATE app_sessions SET revoked=1 WHERE property=? AND user_id=?').run(f.owner,f.editor);
  assert.equal((await call(f.editor,'recovery','POST',{action:'request',propertyId:f.owner,publicKey:replacement.publicKey})).status,200);
  cookies.delete(f.owner);assert.equal((await call(f.owner,'team-workspace')).status,200);
  assert.equal((await call(f.owner,'recovery','POST',{action:'approve',propertyId:f.owner,id:ticket.id})).status,200);
  assert.equal(JSON.parse(sql.prepare('SELECT public_key FROM identities WHERE user_id=?').get(f.editor).public_key).n,replacement.publicKey.n);
});
test('actual API routes enforce scope, key recipients, CSRF, concurrency, sessions and disabled accounts',async()=>{
  assert.equal((await call(null,'team-workspace')).status,401);
  const owner=await newIdentity(),reader=await newIdentity();
  for(const [actor,identity] of [['owner',owner],['reader',reader]]){assert.equal((await call(actor,'team-workspace')).status,200);assert.equal((await call(actor,'team-workspace','POST',{action:'identity',publicKey:identity.publicKey})).status,200);}
  const directory={employees:[{id:'e1',department:'fo',position:'agent',active:true},{id:'e2',department:'hk',position:'attendant',active:true}],reporting:[]};
  assert.equal((await bootstrapProperty('owner',{directory,timezone:'America/Chicago',boundaries:['07:00','15:00','23:00']})).status,200);
  assert.equal((await call('reader','team-workspace','GET',undefined,'?property=owner')).status,403);
  const invitation=await call('owner','team','POST',{action:'invite',propertyId:'owner',email:'reader@example.invalid'});assert.equal(invitation.status,200);
  const token=new URL(invitation.value.inviteUrl).searchParams.get('join');
  assert.equal((await call('reader','team','POST',{action:'join',token})).status,200);
  assert.equal((await call('reader','team-workspace','GET',undefined,'?property=owner')).status,403);
  const grants=[...profileGrants('Frontline'),{capability:'Training.View',scope:{type:'department',ids:['fo']}}];
  assert.equal((await call('owner','team','POST',{action:'approve',propertyId:'owner',userId:'reader',employeeId:'e1',grants})).status,200);
  const context=(await call('owner','team-workspace')).value;
  const records=[];for(const [id,field,subject,value] of [['config','config','',{name:'Test property',timezone:'America/Chicago'}],['training:one','training','e1',{id:'one',employee:'e1',notes:'Allowed coaching'}],['training:two','training','e2',{id:'two',employee:'e2',notes:'Denied coaching'}],['passon:one','passon','',{id:'one',subject:'Operational handoff',status:'Open'}]])records.push(await seal(value,owner,context.members,{id,propertyId:'owner',field,subject,revision:0},directory));
  const saved=await call('owner','team-workspace','PUT',{propertyId:'owner',revision:context.revision,records,deleted:[],directory});assert.equal(saved.status,200,JSON.stringify(saved.value));
  const visible=await call('reader','team-workspace','GET',undefined,'?property=owner');assert.equal(visible.status,200);assert.deepEqual(visible.value.resources.filter(r=>r.field==='training').map(r=>r.subject),['e1']);assert.deepEqual(await openResource(visible.value.resources.find(r=>r.field==='training'),reader,'reader'),{id:'one',employee:'e1',notes:'Allowed coaching'});
  const unauthorized=await call('reader','team-workspace','PUT',{propertyId:'owner',revision:visible.value.revision,records:[records.find(r=>r.subject==='e2')],deleted:[]});assert.equal(unauthorized.status,403);
  const stale=await call('owner','team-workspace','PUT',{propertyId:'owner',revision:context.revision,records,deleted:[],directory});assert.equal(stale.status,409);
  const fakeHeaders=new Headers({'Origin':'https://attacker.invalid','Content-Type':'application/json'});const csrf=await globalThis.__easymanHeaders.run(new Headers({'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.invalid'}),()=>routes['team-workspace'].PUT(new Request('https://easyman.test/api/team-workspace',{method:'PUT',headers:fakeHeaders,body:'{}'})));assert.equal(csrf.status,403);
  const team=(await call('owner','team', 'GET',undefined,'?property=owner')).value;const session=team.sessions.find(s=>s.user_id==='reader'&&s.property!=='reader');
  // Query returns only this property's sessions, never other-property sessions.
  const readerSession=team.sessions.find(s=>s.user_id==='reader');assert.ok(readerSession);
  assert.equal((await call('owner','team','POST',{action:'revoke-session',propertyId:'owner',sessionId:readerSession.id})).status,200);
  assert.equal((await call('reader','team-workspace','GET',undefined,'?property=owner')).status,401);
  assert.equal((await call('owner','team','POST',{action:'disable',propertyId:'owner',userId:'reader'})).status,200);
  assert.equal((await call('reader','session-reset','POST',{propertyId:'owner'})).status,200);
  assert.equal((await call('reader','team-workspace','GET',undefined,'?property=owner')).status,403);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE owner='owner'").get().count>3,true);
});
test('unattended snapshots reconstruct the exact encrypted boundary state and remain idempotent',async()=>{
  const identity=await newIdentity(),m={userId:'snapshot-owner',employeeId:'',status:'active',grants:[{capability:'*',scope:{type:'property'}}],publicKey:identity.publicKey};const directory={employees:[],reporting:[]};
  const base={id:'passon:one',propertyId:'snapshot-property',field:'passon',subject:'',revision:0};
  const before=await seal({id:'one',subject:'Before handover',status:'Open'},identity,[m],base,directory),after=await seal({id:'one',subject:'After handover',status:'Completed'},identity,[m],base,directory);
  sql.prepare("INSERT INTO properties (id,owner,directory,timezone,boundaries,created_at) VALUES (?,?,?,?,?,?)").run('snapshot-property','snapshot-owner',JSON.stringify(directory),'America/Chicago','["07:00"]','2026-10-07T11:00:00.000Z');
  sql.prepare('INSERT INTO encrypted_resources (id,property,field,subject,ciphertext,iv,wrapped,revision,updated_at,aad) VALUES (?,?,?,?,?,?,?,?,?,?)').run('snapshot-property::passon:one','snapshot-property','passon','',after.ciphertext,after.iv,JSON.stringify(after.wrapped),2,'2026-10-07T12:01:00.000Z',after.aadVersion);
  sql.prepare('INSERT INTO resource_versions (id,property,resource_id,data,actor,timestamp) VALUES (?,?,?,?,?,?)').run('snapshot-version','snapshot-property','snapshot-property::passon:one',JSON.stringify({...before,validFrom:'2026-10-07T11:50:00.000Z'}),'snapshot-owner','2026-10-07T12:01:00.000Z');
  assert.equal((await captureDueSnapshots('snapshot-owner',new Date('2026-10-07T12:05:00.000Z'))).captured,1);
  const snapshot=sql.prepare("SELECT * FROM shift_snapshots WHERE property='snapshot-property'").get();assert.equal(snapshot.boundary,'2026-10-07T12:00:00.000Z');
  const items=JSON.parse(snapshot.data);assert.equal(items.length,1);assert.equal((await openResource(items[0],identity,'snapshot-owner')).status,'Open');
  assert.equal((await captureDueSnapshots('snapshot-owner',new Date('2026-10-07T12:06:00.000Z'))).captured,0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM shift_snapshots WHERE property='snapshot-property'").get().n,1);
});


test('background checks leave a private read-only receipt even when no new boundary is due',async()=>{
  const before=await propertySnapshotStatus('snapshot-property');assert.equal(before.lastBackgroundRun,null);
  await captureDueSnapshots('snapshot-owner',new Date('2026-10-07T12:07:00.000Z'),'background');
  const after=await propertySnapshotStatus('snapshot-property');assert.equal(after.total,1);assert.equal(after.lastBackgroundRun.captured,0);assert.ok(after.lastBackgroundRun.at);
  const count=sql.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE owner='snapshot-property'").get().n;
  await propertySnapshotStatus('snapshot-property');assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE owner='snapshot-property'").get().n,count);
  assert.doesNotMatch(JSON.stringify(after),/Before handover|ciphertext|wrapped/);
});

test('MCP discovery and capture/status operations enforce caller ownership and reject supplied owner arguments',async()=>{
  const discover=await call(null,'mcp','POST',{jsonrpc:'2.0',id:1,method:'server/discover'});assert.deepEqual(discover.value.result.supportedVersions,['2026-07-28']);
  const list=await call(null,'mcp','POST',{jsonrpc:'2.0',id:2,method:'tools/list'});assert.deepEqual(list.value.result.tools.map(t=>t.name),['capture_shift_snapshots','snapshot_status']);
  const request={jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'snapshot_status',arguments:{}}};
  assert.equal((await call(null,'mcp','POST',request)).status,401);
  const denied=await call('stranger','mcp','POST',request);assert.deepEqual(denied.value.result.structuredContent.properties,[]);
  const owner=await call('owner','mcp','POST',request);assert.equal(owner.value.result.structuredContent.properties.length,1);assert.equal(owner.value.result.structuredContent.properties[0].propertyId,'owner');
  assert.equal((await call('stranger','mcp','POST',{...request,params:{name:'capture_shift_snapshots',arguments:{owner:'owner'}}})).value.result.isError,true);
  const run=await call('snapshot-owner','mcp','POST',{...request,params:{name:'capture_shift_snapshots',arguments:{}}});assert.equal(run.status,200);assert.equal(run.value.result.isError,undefined);
  assert.equal((await call('owner','snapshot-status','GET',undefined,'?property=owner')).status,200);
  assert.notEqual((await call('stranger','snapshot-status','GET',undefined,'?property=owner')).status,200);
});

test('snapshot catch-up advances in bounded batches, ignores duplicate times and keeps one snapshot per boundary',async()=>{
  sql.prepare("INSERT INTO properties (id,owner,directory,timezone,boundaries,created_at) VALUES (?,?,?,?,?,?)").run('catchup-property','catchup-owner','{"employees":[],"reporting":[]}','America/Chicago','["07:00","07:00"]','2026-07-01T05:00:00.000Z');
  const now=new Date('2026-09-02T00:00:00.000Z');
  assert.equal((await captureDueSnapshots('catchup-owner',now)).captured,31);
  assert.equal((await captureDueSnapshots('catchup-owner',now)).captured,30);
  assert.equal((await captureDueSnapshots('catchup-owner',now)).captured,2);
  assert.equal((await captureDueSnapshots('catchup-owner',now)).captured,0);
  const count=sql.prepare("SELECT COUNT(*) AS n FROM shift_snapshots WHERE property='catchup-property'").get().n;assert.equal(count,63);
});

test('daily housekeeping plans and dated tasks persist through the real API with scoped plan edits denied',async()=>{
  const owner=await newIdentity(),scoped=await newIdentity(),actor='hk-owner',reader='hk-scoped';
  for(const [id,identity] of [[actor,owner],[reader,scoped]]){await call(id,'team-workspace');assert.equal((await call(id,'team-workspace','POST',{action:'identity',publicKey:identity.publicKey})).status,200);}
  const directory={employees:[{id:'attendant',department:'hk',position:'attendant',active:true}],reporting:[]};
  assert.equal((await bootstrapProperty(actor,{directory,timezone:'America/Chicago',boundaries:[]})).status,200);
  const invite=await call(actor,'team','POST',{action:'invite',propertyId:actor,email:reader+'@example.invalid'}),token=new URL(invite.value.inviteUrl).searchParams.get('join');
  await call(reader,'team','POST',{action:'join',token});
  await call(actor,'team','POST',{action:'approve',propertyId:actor,userId:reader,employeeId:'attendant',grants:[{capability:'HousekeepingBoards.View',scope:{type:'employees',ids:['attendant']}},{capability:'HousekeepingBoards.Assign',scope:{type:'employees',ids:['attendant']}}]});
  const context=(await call(actor,'team-workspace')).value,records=[];
  for(const day of ['2026-10-10','2026-10-11'])for(const [id,field,subject,value] of [['housekeepingDays:'+day,'housekeepingDays','',{id:day,date:day,attendantIds:['attendant'],items:[{room:'one',service:'stayover'}],catalog:[]}],['boards:'+day+':one','boards','attendant',{id:day+'-one',room:'one',date:day,service:'stayover',employee:'attendant',status:'To clean'}]])records.push(await seal(value,owner,context.members,{id,field,subject,propertyId:actor,revision:0},directory));
  const saved=await call(actor,'team-workspace','PUT',{propertyId:actor,revision:context.revision,records,deleted:[]});assert.equal(saved.status,200,JSON.stringify(saved.value));
  const visible=(await call(reader,'team-workspace','GET',undefined,'?property='+actor)).value;assert.equal(visible.resources.length,2);assert.ok(visible.resources.every(r=>r.field==='boards'));assert.deepEqual((await Promise.all(visible.resources.map(r=>openResource(r,scoped,reader)))).map(v=>v.date).sort(),['2026-10-10','2026-10-11']);
  const denied=await call(reader,'team-workspace','PUT',{propertyId:actor,revision:visible.revision,records:[records.find(r=>r.field==='housekeepingDays')],deleted:[]});assert.equal(denied.status,403);
  const reopened=(await call(actor,'team-workspace')).value;assert.equal(reopened.resources.filter(r=>r.field==='housekeepingDays').length,2);for(const plan of reopened.resources.filter(r=>r.field==='housekeepingDays'))assert.deepEqual((await openResource(plan,owner,actor)).attendantIds,['attendant']);assert.ok((await Promise.all(visible.resources.map(r=>openResource(r,scoped,reader)))).every(v=>v.service==='stayover'));
});

test('release recovery restores an encrypted backup into an empty isolated property through actual storage routes',async()=>{
  const actor='release-recovery-owner',identity=await newIdentity(),empty=emptyState();empty.config.name='TEST empty recovery property';empty.config.sample=false;
  await call(actor,'team-workspace');assert.equal((await call(actor,'team-workspace','POST',{action:'identity',publicKey:identity.publicKey})).status,200);
  assert.equal((await bootstrapProperty(actor,{directory:directory(empty),timezone:empty.config.timezone,boundaries:empty.config.boundaries})).status,200);
  async function saveState(state){const context=(await call(actor,'team-workspace')).value,records=[];for(const item of resources(state,actor))records.push(await seal(item.value,identity,context.members,{id:item.id,field:item.field,subject:item.subject,propertyId:actor,revision:0},directory(state)));const result=await call(actor,'team-workspace','PUT',{propertyId:actor,revision:context.revision,records,deleted:[],directory:directory(state)});assert.equal(result.status,200,JSON.stringify(result.value));}
  await saveState(empty);const reopenedEmpty=await decode((await call(actor,'team-workspace')).value.resources,identity,actor);assert.equal(reopenedEmpty.rooms.length,0);assert.equal(reopenedEmpty.sample,false);
  const source=seed(),day=today(source.config.timezone);source.config.name='TEST restored property';let backup=applyDaySetup(source,day,[{roomNumber:'201',service:'departure'},{roomNumber:'202',service:'stayover'}],true,['e8','e9']);backup=updateDayTask(backup,day,'r0',{status:'Clean',locked:true});
  const encrypted=await encryptBackup(backup,'TEST ONLY release restore passphrase');await assert.rejects(()=>decryptBackup(encrypted,'wrong passphrase'));
  const copy=await decryptBackup(encrypted,'TEST ONLY release restore passphrase'),restored=restoreWorkingCopy(reopenedEmpty,copy,'TEST owner');await saveState(restored);
  const reopened=await decode((await call(actor,'team-workspace')).value.resources,identity,actor),view=housekeepingDay(reopened,day);assert.equal(reopened.config.name,'TEST restored property');assert.equal(reopened.sample,true);assert.equal(reopened.rooms.length,24);assert.equal(view.boards.filter(b=>b.active!==false).length,2);assert.equal(view.boards.find(b=>b.room==='r0').status,'Clean');assert.equal(view.boards.find(b=>b.room==='r0').locked,true);assert.deepEqual(reopened.schedule.map(r=>r.id).sort(),backup.schedule.map(r=>r.id).sort());
});

test('public website access does not permit anonymous operational API reads or writes',async()=>{
  for(const name of ['team-workspace','team','keys','recovery','session-reset','snapshots','snapshot-status','workspace','audit','sessions','feedback']){
    for(const method of ['GET','POST','PUT'].filter(m=>routes[name][m])) {
      const result=await call(null,name,method,method==='GET'?undefined:{action:'approve',propertyId:'owner',id:'not-a-real-request'});
      if(name==='feedback'&&method==='GET'){
        assert.equal(result.status,200);assert.deepEqual(Object.keys(result.value),['configured']);assert.equal(typeof result.value.configured,'boolean');
      }else assert.equal(result.status,401,name+' '+method);
      assert.ok(!JSON.stringify(result.value).includes('ciphertext'),name+' '+method+' disclosed records');
    }
  }
});

async function bootstrapProperty(actor,data){
 // Explicit isolated-fixture provisioning. Public self-registration cannot do this.
 sql.prepare('INSERT OR IGNORE INTO properties (id,owner,directory,timezone,boundaries,revision,key_epoch,created_at) VALUES (?,?,?,?,?,0,0,?)').run(actor,actor,JSON.stringify(data.directory),data.timezone||'America/Chicago',JSON.stringify(data.boundaries||[]),new Date().toISOString());
 sql.prepare("INSERT OR IGNORE INTO members (id,property,user_id,email,employee_id,status,grants,created_at) VALUES (?,?,?,?,?,'active',?,?)").run(actor+'::'+actor,actor,actor,actor+'@example.invalid','',JSON.stringify([{capability:'*',scope:{type:'property'}}]),new Date().toISOString());
 return call(actor,'team-workspace','POST',{action:'create',...data});
}

async function registeredBrowser(name){
 const actor='browser:'+name,email=name+'@example.invalid',password='TEST only fictional staff passphrase 2026!',code=randomToken(),identity=await newIdentity();const data={action:'signup',email,password,name:'TEST '+name,publicKey:identity.publicKey,passwordVault:await lockLoginKey(identity,password),recoveryCode:code,recoveryVault:await lockLoginKey(identity,code)};const response=await call(actor,'account','POST',data);assert.equal(response.status,201,JSON.stringify(response.value));return {actor,email,password,code,identity,id:response.value.userId,response};
}
test('independent signup starts with zero memberships and no bootstrap or property reads; cookies and stored verifiers are protected',async()=>{
 const registered=await registeredBrowser('pending-native');const profile=await call(registered.actor,'account');assert.equal(profile.status,200);assert.deepEqual(profile.value.memberships,[]);assert.match(profile.value.requestCode,/^EM-/);assert.equal((await call(registered.actor,'feedback','POST',{})).status,403);assert.match(registered.response.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);assert.match(registered.response.headers.get('set-cookie'),/; Secure/);
 const row=sql.prepare('SELECT * FROM auth_accounts WHERE id=?').get(registered.id);assert.notEqual(row.password_hash,registered.password);assert.ok(!row.password_vault.includes(registered.password));assert.notEqual(row.recovery_hash,registered.code);assert.equal(row.credential_version,1);
 assert.equal((await call(registered.actor,'team-workspace','POST',{action:'create',directory:{employees:[],reporting:[]}})).status,403);assert.equal((await call(registered.actor,'workspace')).status,403);assert.equal((await call(registered.actor,'team-workspace')).status,403);
 assert.equal((await call('new-unapproved-chatgpt','team-workspace','POST',{action:'create',directory:{employees:[],reporting:[]}})).status,403);
 const bad=await call('browser:wrong-password','account','POST',{action:'login',email:registered.email,password:'TEST wrong fictional password'});assert.equal(bad.status,401);const missing=await call('browser:wrong-password','account','POST',{action:'login',email:'not-registered@example.invalid',password:registered.password});assert.deepEqual(bad.value,missing.value);
 for(const value of ['short','123456789012345','a'.repeat(130)])assert.throws(()=>validPassword(value));
 assert.equal(validPassword('Long passwords may contain spaces!'),'Long passwords may contain spaces!');
 const a=await passwordDigest('TEST equal password','first salt'),b=await passwordDigest('TEST equal password','second salt');assert.notEqual(a,b);
});
test('approved native staff receive linked boards/log and their own published copies, never live drafts, personnel, management or other employee schedules',async()=>{
 const f=await editingFixture('native-staff'),r=await registeredBrowser('approved-native');
 const code=(await call(r.actor,'account')).value.requestCode;assert.equal((await call(f.owner,'team','POST',{action:'add-account',propertyId:f.owner,requestCode:code})).status,200);
 assert.equal((await call(r.actor,'team-workspace','GET',undefined,'?property='+f.owner)).status,403);
 const grants=staffGrants('e1',{boards:'assigned',log:true,schedule:true});
 assert.equal((await call(f.owner,'team','POST',{action:'approve',propertyId:f.owner,userId:r.id,employeeId:'',grants})).status,400);
 assert.equal((await call(f.owner,'team','POST',{action:'approve',propertyId:f.owner,userId:r.id,employeeId:'e1',grants})).status,200);
 // Save a draft and published copies using real encryption and actual routes.
 const state=f.state;state.schedule.push({id:'other-draft',employee:'e2',date:state.week,shift:'pm',position:'agent'});state.passon=[{id:'front-log',subject:'TEST front log',description:'Fictional handover',status:'Open',history:[]}];state.boards=[{id:'staff-task',date:today(),room:'r0',employee:'e1',status:'To clean',service:'departure',active:true}];state.snapshots.push({id:'native-own-publication',employee:'e1',type:'schedule',week:state.week,at:new Date().toISOString(),items:[state.schedule[0]],shifts:state.config.shifts},{id:'native-other-publication',employee:'e2',type:'schedule',week:state.week,at:new Date().toISOString(),items:[state.schedule[1]],shifts:state.config.shifts});
 let owner=(await call(f.owner,'team-workspace')).value;const encrypted=[];for(const item of resources(state,f.owner)){if(owner.resources.some(old=>old.id===item.id)&&['scheduleArchives','snapshots'].includes(item.field))continue;encrypted.push(await seal(item.value,f.identity,owner.members,{id:item.id,field:item.field,subject:item.subject,propertyId:f.owner,revision:0},f.dir));}
 assert.equal((await call(f.owner,'team-workspace','PUT',{propertyId:f.owner,revision:owner.revision,records:encrypted,deleted:[]})).status,200);
 // Exercise the same provisioning path used by the approval UI, including history.
 owner=(await call(f.owner,'team-workspace')).value;const stored=(await call(f.owner,'keys','GET',undefined,'?property='+f.owner)).value,rewrapped=[];for(const record of stored)rewrapped.push(await rewrap(record,f.identity,owner.members,f.owner,f.dir));assert.equal((await call(f.owner,'keys','POST',{propertyId:f.owner,records:rewrapped})).status,200);
 const read=await call(r.actor,'team-workspace','GET',undefined,'?property='+f.owner);assert.equal(read.status,200,JSON.stringify(read.value));const fields=read.value.resources.map(x=>x.field);assert.ok(fields.includes('boards'));assert.ok(fields.includes('passon'));assert.ok(fields.includes('scheduleArchives'));for(const denied of ['schedule','availability','preferences','training','discipline','employeePrivate','staffingWeeks'])assert.ok(!fields.includes(denied),denied);
 assert.ok(read.value.resources.filter(x=>x.field==='scheduleArchives').every(x=>x.subject==='e1'));const opened=await decode(read.value.resources,r.identity,r.id);assert.equal(opened.schedule.length,0);assert.ok(opened.snapshots.some(x=>x.id==='native-own-publication'));assert.ok(!opened.snapshots.some(x=>x.id==='native-other-publication'));
 assert.equal((await call(r.actor,'team','GET',undefined,'?property='+f.owner)).status,403);assert.equal((await call(r.actor,'keys','GET',undefined,'?property='+f.owner)).status,403);
 const clientFile=path.join(out,'native-team-client.mjs');await build({entryPoints:['app/team-client.ts'],outfile:clientFile,bundle:true,format:'esm',platform:'node',logLevel:'silent'});const {saveTeam}=await import(pathToFileURL(clientFile));
 const known=new Map();for(const item of resources(opened,r.id)){const resource=read.value.resources.find(x=>x.id===item.id);if(resource)known.set(item.id,{resource,value:JSON.stringify(item.value)});}
 const staffContext={propertyId:f.owner,revision:read.value.revision,keyEpoch:read.value.keyEpoch,member:read.value.member,members:read.value.members,directory:read.value.directory,identity:r.identity,known};
 const logItem=opened.passon[0];logItem.history=[{text:'TEST native staff update',by:'TEST staff',at:new Date().toISOString()}];const priorFetch=globalThis.fetch;globalThis.fetch=async(url,options={})=>{const parsed=new URL(url,'https://easyman.test'),result=await call(r.actor,'team-workspace',options.method||'GET',options.body?JSON.parse(options.body):undefined,parsed.search);return Response.json(result.value,{status:result.status});};
 try{await saveTeam(opened,staffContext,r.id);}finally{globalThis.fetch=priorFetch;}
 const saved=(await call(r.actor,'team-workspace','GET',undefined,'?property='+f.owner)).value;assert.equal((await decode(saved.resources,r.identity,r.id)).passon[0].history[0].text,'TEST native staff update');
 const priorSession=sql.prepare('SELECT id FROM app_sessions WHERE user_id=? AND property=? ORDER BY created_at DESC').get(r.id,f.owner);sql.prepare('UPDATE app_sessions SET revoked=1 WHERE id=?').run(priorSession.id);
 const signedIn=await call(r.actor,'account','POST',{action:'login',email:r.email,password:r.password});assert.equal(signedIn.status,200);assert.ok(signedIn.headers.getSetCookie().some(c=>/^easyman_session_/.test(c)&&c.includes('Max-Age=0')));assert.equal((await call(r.actor,'team-workspace','GET',undefined,'?property='+f.owner)).status,200);
 const managerGrants=profileGrants('Manager');sql.prepare('UPDATE members SET grants=? WHERE property=? AND user_id=?').run(JSON.stringify(managerGrants),f.owner,f.editor);
 assert.equal((await call(f.editor,'team','POST',{action:'grants',propertyId:f.owner,userId:r.id,employeeId:'e1',grants:[{capability:'*',scope:{type:'property'}}]})).status,400);
 assert.equal((await call(f.editor,'team','POST',{action:'grants',propertyId:f.owner,userId:r.id,employeeId:'e1',grants:staffGrants('e1',{schedule:true,log:true})})).status,200);
 assert.equal((await call(f.editor,'team','POST',{action:'disable',propertyId:f.owner,userId:f.editor})).status,400);
 assert.equal((await call(f.owner,'team','POST',{action:'disable',propertyId:f.owner,userId:r.id})).status,200);assert.ok([401,403].includes((await call(r.actor,'team-workspace','GET',undefined,'?property='+f.owner)).status));
});
test('password change and recovery keep the same encryption identity, rotate recovery codes and invalidate old login sessions',async()=>{
 const r=await registeredBrowser('password-native');const login=await call('browser:second-device','account','POST',{action:'login',email:r.email,password:r.password});assert.equal(login.status,200);const unlocked=await unlockLoginKey(login.value.passwordVault,r.password);assert.equal(unlocked.publicKey.n,r.identity.publicKey.n);
 const changed='TEST newly chosen staff passphrase 2026!';const vault=await lockLoginKey(r.identity,changed);assert.equal((await call(r.actor,'account','POST',{action:'change-password',currentPassword:r.password,password:changed,passwordVault:vault})).status,200);assert.equal((await call('browser:second-device','account')).status,401);
 assert.equal((await call('browser:old-password','account','POST',{action:'login',email:r.email,password:r.password})).status,401);
 const opened=await call('browser:recover','account','POST',{action:'recover-open',email:r.email,recoveryCode:r.code});assert.equal(opened.status,200);const identity=await unlockLoginKey(opened.value.recoveryVault,r.code);assert.equal(identity.publicKey.n,r.identity.publicKey.n);
 const nextCode=randomToken(),nextPassword='TEST recovered account passphrase 2026!';assert.equal((await call('browser:recover','account','POST',{action:'recover',email:r.email,recoveryCode:r.code,password:nextPassword,passwordVault:await lockLoginKey(identity,nextPassword),newRecoveryCode:nextCode,recoveryVault:await lockLoginKey(identity,nextCode)})).status,200);assert.equal((await call(r.actor,'account')).status,401);assert.equal((await call('browser:recover','account','POST',{action:'recover-open',email:r.email,recoveryCode:r.code})).status,401);
 const fresh=await call('browser:final-device','account','POST',{action:'login',email:r.email,password:nextPassword});assert.equal(fresh.status,200);assert.equal((await unlockLoginKey(fresh.value.passwordVault,nextPassword)).publicKey.n,r.identity.publicKey.n);
 const before=cookies.get('browser:final-device');assert.equal((await call('browser:final-device','account','POST',{action:'logout'})).status,200);cookies.set('browser:replay',before);assert.equal((await call('browser:replay','account')).status,401);
});


