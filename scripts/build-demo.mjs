import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const DEMO_CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export async function buildDemo({root=process.cwd(),outdir=path.resolve('.sites-runtime/demo-preview'),probe=false}={}){
  root=path.resolve(root);outdir=path.resolve(outdir);
  const hostingPath=path.join(root,'.openai/hosting.json');
  if(outdir===path.join(root,'dist')&&fs.existsSync(hostingPath)){
    const hosting=JSON.parse(fs.readFileSync(hostingPath,'utf8'));
    if(hosting.d1||hosting.r2)throw Error('Keep demo output separate from the real app build directory.');
  }
  const assetDirectory=path.join(outdir,'assets');
  if(fs.existsSync(assetDirectory)){
    if(fs.lstatSync(assetDirectory).isSymbolicLink())throw Error('Demo assets must be a regular directory.');
    for(const name of fs.readdirSync(assetDirectory).filter(n=>/^(demo|chunk)-[A-Z0-9]+\.(js|css)$/.test(n))){
      const file=path.resolve(assetDirectory,name);
      if(!file.startsWith(assetDirectory+path.sep)||!fs.lstatSync(file).isFile())throw Error('Unsafe generated demo asset.');
      fs.unlinkSync(file);
    }
  }
  const result=await build({absWorkingDir:root,entryPoints:[path.join(root,'demo/entry.tsx')],outdir:path.join(outdir,'assets'),bundle:true,splitting:true,format:'esm',platform:'browser',target:'es2022',jsx:'automatic',minify:true,metafile:true,entryNames:'demo-[hash]',chunkNames:'chunk-[hash]',assetNames:'asset-[hash]',logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-demo',setup(b){
    b.onResolve({filter:/^\.\/team-client$/},a=>({path:path.join(root,'demo/live-disabled.ts')}));
    b.onResolve({filter:/^\.\/team-panel$/},a=>({path:path.join(root,'demo/team-disabled.tsx')}));
    b.onResolve({filter:/^\.\/team-crypto$/},a=>a.importer===path.join(root,'app/workspace.tsx')?{path:path.join(root,'demo/live-disabled.ts')}:null);
    b.onResolve({filter:/^\.\/vault$/},a=>({path:path.join(root,'demo/demo-vault.ts')}));
    b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},a=>{throw Error('Server dependency in static demo: '+a.path);});
    b.onLoad({filter:/app[\\/]globals\.css$/},a=>({contents:fs.readFileSync(a.path,'utf8').replace('@import "tailwindcss";',''),loader:'css'}));
    b.onLoad({filter:/node_modules[\\/]exceljs[\\/]dist[\\/]exceljs\.min\.js$/},a=>{
      const code=fs.readFileSync(a.path,'utf8');
      // ExcelJS's bundled util-deprecate reads browser warning preferences.
      // The isolated demo uses its default warning behavior without storage.
      const preference='function r(t){try{if(!e.localStorage)return!1}catch(e){return!1}var r=e.localStorage[t];return null!=r&&"true"===String(r).toLowerCase()}';
      if(!code.includes(preference))throw Error('Review the ExcelJS demo storage guard after changing the dependency.');
      return {contents:code.replace(preference,'function r(t){return!1}'),loader:'js'};
    });
  }}]});
  const outputs=Object.entries(result.metafile.outputs),entry=outputs.find(([,meta])=>meta.entryPoint?.replaceAll('\\','/')==='demo/entry.tsx');
  if(!entry)throw Error('Missing demo entry output');
  for(const [file] of outputs)if(file.endsWith('.js')&&/\b(localStorage|sessionStorage|indexedDB)\b/.test(fs.readFileSync(path.resolve(root,file),'utf8')))throw Error('Persistent browser storage reference in demo output: '+file);
  for(const input of Object.keys(result.metafile.inputs))if(/app\/(vault|team-client|team-panel|team-server|chatgpt-auth)\.(ts|tsx)$/.test(input.replaceAll('\\','/'))||/app\/api\//.test(input))throw Error('Live module in demo bundle: '+input);
  const asset=file=>'/'+path.relative(outdir,path.resolve(root,file)).replaceAll('\\','/');
  const js=asset(entry[0]),css=entry[1].cssBundle?asset(entry[1].cssBundle):null;
  fs.mkdirSync(outdir,{recursive:true});
  const probeTag=probe?'<script type="module" src="/test-probe.js"></script>':'';
  fs.writeFileSync(path.join(outdir,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${DEMO_CSP}"><meta name="robots" content="noindex,nofollow"><meta name="description" content="Explore EasyMan with a temporary fictional hotel. No login or saved data."><title>EasyMan — Interactive demo</title><link rel="icon" href="/favicon.svg">${css?`<link rel="stylesheet" href="${css}">`:''}</head><body><div id="demo-root"><p>Opening the fictional hotel…</p></div><noscript>This interactive demo needs JavaScript. <a href="https://easyman.app/">Visit the EasyMan website</a>.</noscript>${probeTag}<script type="module" src="${js}"></script></body></html>`);
  fs.writeFileSync(path.join(outdir,'robots.txt'),'User-agent: *\nDisallow: /\n');
  if(fs.existsSync(path.join(root,'public/favicon.svg')))fs.copyFileSync(path.join(root,'public/favicon.svg'),path.join(outdir,'favicon.svg'));
  fs.mkdirSync(path.join(outdir,'license'),{recursive:true});fs.writeFileSync(path.join(outdir,'license/index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EasyMan demo — License & source</title><body><main><h1>License & source</h1><p>Copyright © 2026 Michael Leza and EasyMan contributors. EasyMan original code and documentation use AGPL-3.0-only. Provided without warranty; see the full license. Third-party dependencies retain their licenses.</p><p><a href="https://github.com/tellesus/easyman">Corresponding source and build instructions</a> · <a href="https://github.com/tellesus/easyman/blob/main/LICENSE">Full license</a> · <a href="https://easyman.app/">Website</a></p></main></body></html>');
  fs.writeFileSync(path.join(outdir,'build-manifest.json'),JSON.stringify({inputs:Object.keys(result.metafile.inputs),entry:js,css,csp:DEMO_CSP,probe},null,2));
  if(probe)fs.writeFileSync(path.join(outdir,'test-probe.js'),`const names=['fetch','XMLHttpRequest','WebSocket','EventSource'];document.documentElement.dataset.demoNetworkCalls='0';document.documentElement.dataset.demoStorageCalls='0';const fail=key=>{document.documentElement.dataset[key]=String(Number(document.documentElement.dataset[key])+1);throw Error('DEMO ISOLATION: '+key);};for(const name of names)Object.defineProperty(window,name,{configurable:true,value:function(){fail('demoNetworkCalls');}});for(const name of ['indexedDB','localStorage','sessionStorage','caches'])Object.defineProperty(window,name,{configurable:true,get(){fail('demoStorageCalls');}});navigator.sendBeacon=()=>{fail('demoNetworkCalls');};`);
  return {entry:js,inputs:Object.keys(result.metafile.inputs).length,outputs:outputs.length,probe};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))console.log(JSON.stringify(await buildDemo({outdir:process.argv[2]?path.resolve(process.argv[2]):undefined,probe:process.argv.includes('--probe')})));
