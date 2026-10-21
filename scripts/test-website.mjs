import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const dir=path.resolve('.sites-runtime/website-tests');mkdirSync(dir,{recursive:true});
const pages={};
for(const [name,entry] of Object.entries({home:'app/page.tsx',app:'app/app/page.tsx'})){
  const file=path.join(dir,name+'.mjs');
  await build({entryPoints:[entry],outfile:file,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'website-platform',setup(b){
    b.onResolve({filter:/^\.\.\/account-server$/},a=>({path:'account-server',namespace:'test'}));
    b.onResolve({filter:/^(next\/headers|next\/navigation)$/},a=>({path:a.path,namespace:'test'}));
    b.onResolve({filter:/^\.\.?\/(workspace|marketing|staff-workspace|account-waiting)$/},a=>({path:a.path,namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='account-server'?`export async function getAccountUser(){const h=globalThis.__websiteAuthHeaders;return h.get('oai-authenticated-user-id')?{userId:h.get('oai-authenticated-user-id'),displayName:h.get('oai-authenticated-user-email'),email:h.get('oai-authenticated-user-email'),provider:globalThis.__websiteProvider||'chatgpt'}:null;}export async function accountMemberships(){return globalThis.__websiteMemberships||[{propertyId:'TEST-account',status:'active',employeeId:'',grants:[{capability:'*'}]}];}`:a.path==='next/headers'?'export async function headers(){return globalThis.__websiteAuthHeaders;}':a.path==='next/navigation'?'export function redirect(location){throw Object.assign(new Error("Redirect"),{location});}':a.path.endsWith('staff-workspace')?'export default function StaffWorkspace(){return null;}':a.path.endsWith('account-waiting')?'export default function Waiting(){return null;}':a.path.endsWith('workspace')?'export default function Workspace(){throw Error("Workspace must not execute on anonymous requests");}':'export default function Marketing(){return null;}'}));
  }}]});pages[name]=await import(pathToFileURL(file));
}
test('public home is available while actual app entry authenticates before rendering and preserves invitation/property returns',async()=>{
  globalThis.__websiteAuthHeaders=new Headers();
  const empty={searchParams:Promise.resolve({})};
  const home=await pages.home.default(empty);assert.equal(home.type.name,'Marketing');
  await assert.rejects(()=>pages.app.default(empty),e=>e.location==='/login?returnTo=%2Fapp');
  const args={searchParams:Promise.resolve({property:'TEST property',join:'TEST&token',returnTo:'https://evil.invalid'})};
  await assert.rejects(()=>pages.app.default(args),e=>{
    const url=new URL(e.location,'https://easyman.test'),ret=new URL(url.searchParams.get('returnTo'),'https://easyman.test');
    assert.equal(ret.pathname,'/app');assert.equal(ret.searchParams.get('property'),'TEST property');assert.equal(ret.searchParams.get('join'),'TEST&token');assert.equal(ret.searchParams.has('returnTo'),false);return true;
  });
  await assert.rejects(()=>pages.home.default(args),e=>{const url=new URL(e.location,'https://easyman.test');return url.pathname==='/app'&&url.searchParams.get('join')==='TEST&token';});
  globalThis.__websiteAuthHeaders=new Headers({'oai-authenticated-user-id':'TEST-account','oai-authenticated-user-email':'fiction@example.invalid'});
  const app=await pages.app.default({searchParams:Promise.resolve({property:'TEST-account'})});assert.deepEqual(app.props.user,{id:'TEST-account',name:'fiction@example.invalid',email:'fiction@example.invalid',provider:'chatgpt'});
});

test('credential form uses POST and stays disabled until client handlers are ready',async()=>{
 const file=path.join(dir,'login.mjs');await build({entryPoints:['app/login-ui.tsx'],outfile:file,bundle:true,format:'esm',platform:'node',external:['react','react-dom'],jsx:'automatic',logLevel:'silent'});
 const {default:Login}=await import(pathToFileURL(file)),html=renderToStaticMarkup(createElement(Login));
 assert.match(html,/<form[^>]*method="post"/);assert.match(html,/<form[^>]*action="\/api\/account"/);assert.match(html,/<button class="primary" disabled="">Sign in<\/button>/);assert.match(html,/autoComplete="current-password"/);
});

test('password accounts route to waiting without explicit employee approval and to the scoped staff portal after approval',async()=>{
 globalThis.__websiteAuthHeaders=new Headers({'oai-authenticated-user-id':'TEST-staff','oai-authenticated-user-email':'staff@example.invalid'});globalThis.__websiteProvider='password';
 try{
  globalThis.__websiteMemberships=[];assert.equal((await pages.app.default({searchParams:Promise.resolve({})})).type.name,'Waiting');
  globalThis.__websiteMemberships=[{propertyId:'TEST-property',status:'active',employeeId:'',grants:[{capability:'Scheduling.Published'}]}];assert.equal((await pages.app.default({searchParams:Promise.resolve({property:'TEST-property'})})).type.name,'Waiting');
  globalThis.__websiteMemberships[0].employeeId='TEST-employee';assert.equal((await pages.app.default({searchParams:Promise.resolve({property:'TEST-property'})})).type.name,'StaffWorkspace');
  assert.equal((await pages.app.default({searchParams:Promise.resolve({access:'1'})})).type.name,'Waiting');
 }finally{delete globalThis.__websiteProvider;delete globalThis.__websiteMemberships;}
});


