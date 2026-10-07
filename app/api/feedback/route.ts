import { env } from 'cloudflare:workers';
import { createPrivateKey, sign } from 'node:crypto';
import { getChatGPTUser } from '../../chatgpt-auth';
type Secrets = { GITHUB_APP_CLIENT_ID?: string; GITHUB_APP_PRIVATE_KEY?: string; GITHUB_INSTALLATION_ID?: string; GITHUB_FEEDBACK_REPOSITORY?: string };
const secrets=()=>env as typeof env & Secrets;
const configured=()=>{const e=secrets();return Boolean(e.GITHUB_APP_CLIENT_ID&&e.GITHUB_APP_PRIVATE_KEY&&e.GITHUB_INSTALLATION_ID&&e.GITHUB_FEEDBACK_REPOSITORY);};
export async function GET(){return Response.json({configured:configured()});}
export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in before submitting feedback.'},{status:401});
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
  if(!configured())return Response.json({error:'The private GitHub feedback destination is not configured yet.'},{status:503});
  const raw=await request.text();if(raw.length>15000)return Response.json({error:'Feedback is too long.'},{status:413});
  let data;try{data=JSON.parse(raw);}catch{return Response.json({error:'Invalid feedback.'},{status:400});}
  const {id,category,subject,description}=data;
  if(typeof id!=='string'||!/^[\w-]{36}$/.test(id)||!['Pain Point','Bug','Feature Request'].includes(category)||typeof subject!=='string'||!subject.trim()||subject.length>160||typeof description!=='string'||!description.trim()||description.length>10000)return Response.json({error:'Complete all feedback fields.'},{status:400});
  const prior=await env.DB!.prepare('SELECT status, issue, owner FROM feedback_submissions WHERE id = ?').bind(id).first<{status:string;issue:number;owner:string}>();
  if(prior){if(prior.owner!==user.userId)return Response.json({error:'Invalid feedback ID.'},{status:403});if(prior.status==='submitted')return Response.json({number:prior.issue});if(['sending','uncertain'].includes(prior.status))return Response.json({error:'This submission needs developer review before retrying, to avoid creating a duplicate issue. Copy your draft for your developer.'},{status:409});}
  const recent=await env.DB!.prepare('SELECT COUNT(*) AS count FROM feedback_submissions WHERE owner = ? AND created_at > ?').bind(user.userId,new Date(Date.now()-3600000).toISOString()).first<{count:number}>();
  if((recent?.count||0)>=10)return Response.json({error:'Please wait before sending more feedback.'},{status:429});
  const claimed=prior?await env.DB!.prepare("UPDATE feedback_submissions SET status = 'sending' WHERE id = ? AND status = 'failed'").bind(id).run():await env.DB!.prepare("INSERT OR IGNORE INTO feedback_submissions (id, owner, status, created_at) VALUES (?, ?, 'sending', ?)").bind(id,user.userId,new Date().toISOString()).run();
  if(claimed.meta.changes!==1)return Response.json({error:'This feedback is already being submitted.'},{status:409});
  let issueRequestStarted=false;
  try{
    const e=secrets();const repository=e.GITHUB_FEEDBACK_REPOSITORY!;
    if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))throw new Error('Feedback repository configuration is invalid.');
    const now=Math.floor(Date.now()/1000);const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');const unsigned=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iat:now-60,exp:now+540,iss:e.GITHUB_APP_CLIENT_ID});const jwt=unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),createPrivateKey(e.GITHUB_APP_PRIVATE_KEY!)).toString('base64url');
    const baseHeaders={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'EasyMan','Content-Type':'application/json'};
    const tokenResponse=await fetch(`https://api.github.com/app/installations/${encodeURIComponent(e.GITHUB_INSTALLATION_ID!)}/access_tokens`,{method:'POST',headers:{...baseHeaders,Authorization:'Bearer '+jwt},body:JSON.stringify({repositories:[repository.split('/')[1]],permissions:{issues:'write'}})});
    if(!tokenResponse.ok)throw new Error('GitHub App authentication failed. Ask your developer to check the installation.');
    const {token}=await tokenResponse.json() as {token:string};const headers={...baseHeaders,Authorization:'Bearer '+token};
    const repoResponse=await fetch(`https://api.github.com/repos/${repository}`,{headers});if(!repoResponse.ok)throw new Error('The feedback repository could not be verified.');const repo=await repoResponse.json() as {private:boolean};if(!repo.private)throw new Error('Feedback is blocked because the configured repository is public. Configure a private repository.');
    const label=category==='Bug'?'bug':category==='Pain Point'?'pain-point':'enhancement';
    const labelResponse=await fetch(`https://api.github.com/repos/${repository}/labels/${label}`,{headers});
    issueRequestStarted=true;const issueResponse=await fetch(`https://api.github.com/repos/${repository}/issues`,{method:'POST',headers,body:JSON.stringify({title:`[${category.toUpperCase()}] ${subject}`,body:`Category: ${category}\nEasyMan Version: 0.2 dev\nModule: Developer feedback\nSubmitted: ${new Date().toISOString()}\nFeedback ID: ${id}\n\nDescription:\n\n${description}`,labels:labelResponse.ok?[label]:[]})});
    if(!issueResponse.ok){issueRequestStarted=issueResponse.status>=500;throw new Error('GitHub could not accept this feedback. Your draft is preserved.');}
    const issue=await issueResponse.json() as {number:number};await env.DB!.prepare("UPDATE feedback_submissions SET status = 'submitted', issue = ? WHERE id = ? AND owner = ?").bind(issue.number,id,user.userId).run();return Response.json({number:issue.number});
  }catch(error:any){await env.DB!.prepare('UPDATE feedback_submissions SET status = ? WHERE id = ? AND owner = ?').bind(issueRequestStarted?'uncertain':'failed',id,user.userId).run();return Response.json({error:issueRequestStarted?'GitHub submission could not be confirmed. Ask your developer to check the feedback ID before retrying, to avoid duplicates.':error.message||'Feedback submission failed.'},{status:502});}
}
