import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync,mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { Miniflare, Log, LogLevel } from 'miniflare';

const sql=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
class Statement {
  constructor(query,params=[]){this.query=query;this.params=params;}
  bind(...params){return new Statement(this.query,params);}
  async first(){return sql.prepare(this.query).get(...this.params)||null;}
  async all(){return {results:sql.prepare(this.query).all(...this.params)};}
  async run(){return {meta:{changes:Number(sql.prepare(this.query).run(...this.params).changes)}};}
}
const env={DB:{prepare:q=>new Statement(q),batch:async statements=>{sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}},EASYMAN_SNAPSHOT_STATUS_TOKEN:'test-only-probe'};
globalThis.__snapshotTestEnv=env;
const keyPair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);
const privateJwk=await crypto.subtle.exportKey('jwk',keyPair.privateKey);
env.EASYMAN_SNAPSHOT_PUBLIC_JWK=JSON.stringify(await crypto.subtle.exportKey('jwk',keyPair.publicKey));
mkdirSync('.sites-runtime/scheduler-tests',{recursive:true});
await build({entryPoints:['app/snapshot-job.ts','app/snapshot-server.ts','app/snapshot-health.ts','app/team-crypto.ts'],outdir:'.sites-runtime/scheduler-tests',bundle:true,format:'esm',platform:'node',outExtension:{'.js':'.mjs'},logLevel:'silent',plugins:[{name:'test-platform',setup(b){b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='cloudflare:workers'?'export const env=globalThis.__snapshotTestEnv;':a.path==='next/headers'?'export async function headers(){return new Headers();}':'export function redirect(){throw new Error("Unexpected redirect");}'}));}}]});
const {runSnapshotJob,nativeSnapshotJobStatus}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/scheduler-tests/snapshot-job.mjs'));
const {propertySnapshotStatus,captureDueSnapshots}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/scheduler-tests/snapshot-server.mjs'));
const {snapshotHealthText}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/scheduler-tests/snapshot-health.mjs'));
const {newIdentity,seal,openResource}=await import(pathToFileURL(process.cwd()+'/.sites-runtime/scheduler-tests/team-crypto.mjs'));
async function signed(payload={},signatureKey=keyPair.privateKey){
  const raw=JSON.stringify({purpose:'shift-snapshots',invocationId:crypto.randomUUID(),issuedAt:Date.now(),scheduledAt:Date.now(),...payload});
  const signature=await crypto.subtle.sign('Ed25519',signatureKey,new TextEncoder().encode('EasyManSnapshots/v1\n'+raw));
  return new Request('https://easyman.test/api/internal/shift-snapshots',{method:'POST',headers:{'Content-Type':'application/json','X-EasyMan-Snapshot-Signature':Buffer.from(signature).toString('base64')},body:raw});
}
function property(id,timezone='UTC',boundaries='[]',created=new Date(Date.now()-600000).toISOString()){
  sql.prepare('INSERT INTO properties (id,owner,directory,timezone,boundaries,created_at) VALUES (?,?,?,?,?,?)').run(id,id+'-owner','{"employees":[],"reporting":[]}',timezone,boundaries,created);
}
test('native endpoint requires a valid, fresh signature and rejects owner/time injection without writes',async()=>{
  assert.equal((await runSnapshotJob(new Request('https://easyman.test/api/internal/shift-snapshots',{method:'POST',body:'{}'}))).status,401);
  const wrong=await crypto.subtle.generateKey('Ed25519',false,['sign','verify']);
  assert.equal((await runSnapshotJob(await signed({},wrong.privateKey))).status,401);
  for(const payload of [{issuedAt:Date.now()-181000},{owner:'victim'},{scheduledAt:Date.now()+120000},{purpose:'something-else'}])assert.equal((await runSnapshotJob(await signed(payload))).status,400);
  const oversized=new Request('https://easyman.test',{method:'POST',body:'x'.repeat(1025)});assert.equal((await runSnapshotJob(oversized)).status,413);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM snapshot_scheduler_job').get().n,0);
});
test('scheduled handler runs in the real Workers runtime with no browser or visitor identity, preserving encrypted boundary state',async()=>{
  const boundaryMs=Math.floor(Date.now()/60000)*60000-60000,at=new Date(boundaryMs).toISOString();
  property('native-exact','UTC',JSON.stringify([at.slice(11,16)]),new Date(boundaryMs-60000).toISOString());
  const identity=await newIdentity(),member={userId:'native-exact-owner',status:'active',employeeId:'',grants:[{capability:'*',scope:{type:'property'}}],publicKey:identity.publicKey};
  const meta={id:'passon:test',propertyId:'native-exact',field:'passon',subject:'',revision:0},directory={employees:[],reporting:[]};
  const before=await seal({id:'test',subject:'SYNTHETIC before',status:'Open'},identity,[member],meta,directory);
  const after=await seal({id:'test',subject:'SYNTHETIC after',status:'Completed'},identity,[member],meta,directory);
  const fullId='native-exact::passon:test';
  sql.prepare('INSERT INTO encrypted_resources (id,property,field,subject,ciphertext,iv,wrapped,revision,updated_at,aad) VALUES (?,?,?,?,?,?,?,?,?,?)').run(fullId,'native-exact','passon','',after.ciphertext,after.iv,JSON.stringify(after.wrapped),1,new Date(boundaryMs+1000).toISOString(),1);
  sql.prepare('INSERT INTO resource_versions (id,property,resource_id,data,actor,timestamp) VALUES (?,?,?,?,?,?)').run('native-version','native-exact',fullId,JSON.stringify({...before,validFrom:new Date(boundaryMs-30000).toISOString()}),'test',new Date(boundaryMs+1000).toISOString());
  const built=await build({entryPoints:['infra/snapshot-scheduler/worker.ts'],bundle:true,format:'esm',platform:'browser',write:false,logLevel:'silent'});
  let requests=0, mode='retry';
  // The bundled local workerd supports May's date; production uses the configured current date.
  const runtime=new Miniflare({log:new Log(LogLevel.INFO),unsafeTriggerHandlers:true,modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],bindings:{SNAPSHOT_ORIGIN:'https://easyman.test',SNAPSHOT_SIGNING_JWK:JSON.stringify(privateJwk),SITES_SERVICE_TOKEN:'test-service-only'},outboundService:async request=>{requests++;if(mode==='redirect')return new Response(null,{status:302,headers:{Location:'https://attacker.invalid'}});if(requests===1)return new Response(null,{status:503});assert.equal(request.headers.get('OAI-Sites-Authorization'),'Bearer test-service-only');assert.equal(new URL(request.url).pathname,'/api/internal/shift-snapshots');return runSnapshotJob(new Request(request.url,{method:request.method,headers:request.headers,body:await request.text()}));}});
  try{
    const trigger=()=>runtime.dispatchFetch('http://localhost/cdn-cgi/handler/scheduled?cron='+encodeURIComponent('* * * * *')+'&time='+Date.now());
    const scheduled=await trigger();
    assert.equal(scheduled.status,200,await scheduled.text());
    assert.equal(requests,2,'The scheduled handler must retry the transient failure, then call the application.');
    const row=sql.prepare("SELECT * FROM shift_snapshots WHERE property='native-exact'").get();assert.equal(row.boundary,at);
    assert.equal((await openResource(JSON.parse(row.data)[0],identity,member.userId)).status,'Open');
    const health=await propertySnapshotStatus('native-exact');assert.equal(health.lastBackgroundRun,null);assert.equal(health.nativeScheduler.status,'ok');assert.match(snapshotHealthText(health),/Last automatic check/);
    await trigger();
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM shift_snapshots WHERE property='native-exact'").get().n,1);assert.equal((await propertySnapshotStatus('native-exact')).nativeScheduler.captured,0);assert.equal(requests,3);
    mode='redirect';
    assert.equal((await trigger()).status,500);
    assert.equal(requests,4,'Redirects must not be followed or retried with credentials.');
    assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE owner='native-exact'").get().n,1);
  }finally{await runtime.dispose();}
});
test('leases suppress overlap, expire safely and isolate failures while healthy properties continue',async()=>{
  sql.prepare("UPDATE snapshot_scheduler_job SET lease_until=? WHERE id='native'").run(new Date(Date.now()+60000).toISOString());
  assert.equal((await (await runSnapshotJob(await signed())).json()).skipped,'already-running');
  sql.prepare("UPDATE snapshot_scheduler_job SET lease_until=?,cursor='' WHERE id='native'").run(new Date(Date.now()-1).toISOString());
  property('bad-config','Invalid/Timezone','["07:00"]');property('healthy');
  assert.equal((await runSnapshotJob(await signed())).status,503);
  assert.equal((await propertySnapshotStatus('healthy')).nativeScheduler.status,'ok');
  const bad=await propertySnapshotStatus('bad-config');assert.equal(bad.nativeScheduler.status,'failed');assert.match(snapshotHealthText(bad),/failed/);
  sql.prepare("UPDATE properties SET timezone='UTC',boundaries='[]' WHERE id='bad-config'").run();
  assert.equal((await runSnapshotJob(await signed())).status,200);assert.equal((await propertySnapshotStatus('bad-config')).nativeScheduler.status,'ok');
});
test('read-only native status is separately authenticated and contains no property IDs or encrypted records',async()=>{
  const request=token=>new Request('https://easyman.test/api/internal/shift-snapshots/status',{headers:{'X-EasyMan-Snapshot-Status':token}});
  for(const token of ['','wrong'])assert.equal((await nativeSnapshotJobStatus(request(token))).status,401);
  const result=await nativeSnapshotJobStatus(request('test-only-probe'));assert.equal(result.status,200);const data=await result.json();assert.equal(data.scheduler,'cloudflare-cron');assert.equal(data.job.status,'ok');assert.doesNotMatch(JSON.stringify(data),/ciphertext|wrapped|native-exact|SYNTHETIC/);
  assert.match(snapshotHealthText({nativeScheduler:null,lastBackgroundRun:{at:new Date().toISOString()}}),/not reported a native/);
  assert.match(snapshotHealthText({nativeScheduler:{status:'ok',succeededAt:new Date(Date.now()-360000).toISOString()},staleAfterMinutes:5}),/overdue/);
});
test('native batches rotate properties and bounded history catch-up converges without altering old snapshots',async()=>{
  for(let i=0;i<12;i++)property('rotation-'+i.toString().padStart(2,'0'));
  for(let i=0;i<3;i++)assert.equal((await runSnapshotJob(await signed())).status,200);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM snapshot_scheduler_properties WHERE property LIKE 'rotation-%'").get().n,12);
  const old=sql.prepare("SELECT data FROM shift_snapshots WHERE property='native-exact'").get().data;
  const day=new Date(Date.now()-40*86400000).toISOString().slice(0,10);property('long-catchup','America/Chicago','["07:00","15:00","23:00"]',day+'T05:00:00.000Z');
  for(let i=0;i<30;i++)await runSnapshotJob(await signed());
  assert.ok(sql.prepare("SELECT COUNT(*) AS n FROM shift_snapshots WHERE property='long-catchup'").get().n>=117);
  assert.equal(sql.prepare("SELECT data FROM shift_snapshots WHERE property='native-exact'").get().data,old);
  assert.equal((await captureDueSnapshots('long-catchup-owner')).captured,0);
});
