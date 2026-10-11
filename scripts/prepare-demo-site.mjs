import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),destination=path.resolve(process.argv[2]||'.sites-runtime/demo-site');
if(!destination.startsWith(root+path.sep))throw Error('Demo checkout must be inside the EasyMan workspace');
const hosting=JSON.parse(fs.readFileSync(path.join(destination,'.openai/hosting.json'),'utf8'));
if(!hosting.project_id||hosting.d1||hosting.r2||!hosting.static)throw Error('Use the registered static demo checkout without storage bindings');
const git=process.env.EASYMAN_GIT_BIN||'git';
const files=execFileSync(git,['ls-files','-co','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).filter(file=>file.startsWith('app/')&&!file.slice(4).includes('/')||file.startsWith('demo/')||['scripts/build-demo.mjs','package.json','package-lock.json','LICENSE','LICENSING.md','public/favicon.svg','vendor/shadcn-tailwind-4.13.0.LICENSE.md','build/sites-vite-plugin.LICENSE'].includes(file));
for(const file of files){const target=path.join(destination,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
const pkg=JSON.parse(fs.readFileSync(path.join(destination,'package.json'),'utf8'));pkg.name='easyman-demo';pkg.scripts={build:'node scripts/build-demo.mjs dist'};fs.writeFileSync(path.join(destination,'package.json'),JSON.stringify(pkg,null,2)+'\n');
const lock=JSON.parse(fs.readFileSync(path.join(destination,'package-lock.json'),'utf8'));lock.name='easyman-demo';lock.packages[''].name='easyman-demo';fs.writeFileSync(path.join(destination,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
fs.writeFileSync(path.join(destination,'.gitignore'),'/node_modules/\n/dist/\n/.sites-runtime/\n*.tsbuildinfo\n');
fs.writeFileSync(path.join(destination,'README.md'),'# EasyMan public demo\n\nThis static source snapshot uses the shared EasyMan UI and an explicit in-memory runtime. It has no server, database bindings, authentication, secrets or persistent storage. Install dependencies from the supplied manifest/lockfile and build with `node scripts/build-demo.mjs dist`. The demo bundle excludes live storage/account modules and uses connect-src none. Original source: https://github.com/tellesus/easyman. License: AGPL-3.0-only with retained third-party notices.\n');
console.log(JSON.stringify({checkout:destination,files:files.length,project_id:hosting.project_id}));
