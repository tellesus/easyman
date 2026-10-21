import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {getChatGPTUser} from './chatgpt-auth';
import type {Grant} from './access';
export type AccountUser={userId:string;email:string;displayName:string;fullName:string|null;provider?:'password'|'chatgpt'};
export const LOGIN_COOKIE='easyman_login';
export const accountDb=()=>env.DB!;
export async function accountHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function getAccountUser(request?:Request):Promise<AccountUser|null>{
  const h=request?.headers||await headers(),token=h.get('cookie')?.match(/(?:^|;\s*)easyman_login=([^;]*)/)?.[1];
  if(token!==undefined){if(!/^[a-f0-9]{64}$/.test(token))return null;const row=await accountDb().prepare('SELECT a.id,a.email,a.display_name FROM auth_sessions s JOIN auth_accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.revoked=0 AND s.expires_at>? AND a.disabled=0 AND s.credential_version=a.credential_version').bind(await accountHash(token),new Date().toISOString()).first<any>();return row?{userId:row.id,email:row.email,displayName:row.display_name,fullName:row.display_name,provider:'password'}:null;}
  const trusted=await getChatGPTUser();return trusted?{...trusted,provider:'chatgpt'}:null;
}
export async function accountMemberships(userId:string):Promise<{propertyId:string;status:string;employeeId:string;grants:Grant[]}[]>{const rows=await accountDb().prepare('SELECT property,status,employee_id,grants FROM members WHERE user_id=? ORDER BY created_at').bind(userId).all<any>();return rows.results.map(m=>({propertyId:m.property,status:m.status,employeeId:m.employee_id,grants:JSON.parse(m.grants)}));}
export function safeAccountReturn(value:unknown){if(typeof value!=='string'||!value.startsWith('/app')||value.startsWith('//'))return '/app';try{const u=new URL(value,'https://easyman.invalid');return u.origin==='https://easyman.invalid'&&u.pathname==='/app'?u.pathname+u.search:'/app';}catch{return '/app';}}
export function loginCookie(token:string,request:Request,clear=false){return `${LOGIN_COOKIE}=${clear?'':token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:43200}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
