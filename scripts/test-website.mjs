import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=path.resolve('.sites-runtime/website-tests');mkdirSync(dir,{recursive:true});
const pages={};
for(const [name,entry] of Object.entries({home:'app/page.tsx',app:'app/app/page.tsx'})){
  const file=path.join(dir,name+'.mjs');
  await build({entryPoints:[entry],outfile:file,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'website-platform',setup(b){
    b.onResolve({filter:/^(next\/headers|next\/navigation)$/},a=>({path:a.path,namespace:'test'}));
    b.onResolve({filter:/^\.\.?\/(workspace|marketing)$/},a=>({path:a.path,namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='next/headers'?'export async function headers(){return globalThis.__websiteAuthHeaders;}':a.path==='next/navigation'?'export function redirect(location){throw Object.assign(new Error("Redirect"),{location});}':a.path.endsWith('workspace')?'export default function Workspace(){throw Error("Workspace must not execute on anonymous requests");}':'export default function Marketing(){return null;}'}));
  }}]});pages[name]=await import(pathToFileURL(file));
}
test('public home is available while actual app entry authenticates before rendering and preserves invitation/property returns',async()=>{
  globalThis.__websiteAuthHeaders=new Headers();
  const empty={searchParams:Promise.resolve({})};
  const home=await pages.home.default(empty);assert.equal(home.type.name,'Marketing');
  await assert.rejects(()=>pages.app.default(empty),e=>e.location==='/signin-with-chatgpt?return_to=%2Fapp');
  const args={searchParams:Promise.resolve({property:'TEST property',join:'TEST&token',returnTo:'https://evil.invalid'})};
  await assert.rejects(()=>pages.app.default(args),e=>{
    const url=new URL(e.location,'https://easyman.test'),ret=new URL(url.searchParams.get('return_to'),'https://easyman.test');
    assert.equal(ret.pathname,'/app');assert.equal(ret.searchParams.get('property'),'TEST property');assert.equal(ret.searchParams.get('join'),'TEST&token');assert.equal(ret.searchParams.has('returnTo'),false);return true;
  });
  await assert.rejects(()=>pages.home.default(args),e=>{const url=new URL(e.location,'https://easyman.test');return url.pathname==='/app'&&url.searchParams.get('join')==='TEST&token';});
  globalThis.__websiteAuthHeaders=new Headers({'oai-authenticated-user-id':'TEST-account','oai-authenticated-user-email':'fiction@example.invalid'});
  const app=await pages.app.default(empty);assert.deepEqual(app.props.user,{id:'TEST-account',name:'fiction@example.invalid',email:'fiction@example.invalid'});
});
