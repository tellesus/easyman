import {db,response,endpoint,sameOrigin,body,rate,validPublicKey,audit} from '../../team-server';
import {getAccountUser,accountHash,accountMemberships,loginCookie,safeAccountReturn} from '../../account-server';
import {passwordDigest as derivePasswordDigest,randomToken,normalizeEmail,validPassword} from '../../password-crypto';
import {timingSafeEqual} from 'node:crypto';
const sameDigest=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(new TextEncoder().encode(a),new TextEncoder().encode(b));
async function passwordDigest(password:string,salt:string){try{return await derivePasswordDigest(password,salt);}catch(error){if(error instanceof Error&&error.message.startsWith('Authentication is busy'))throw response({error:error.message},503,{'Retry-After':'1'});throw error;}}

const emailValid=(email:string)=>email.length<=200&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
function vault(value:any){if(!value||value.format!=='easyman-login-key-v1'||!/^[a-f0-9]{64}$/.test(value.salt)||typeof value.ciphertext!=='string'||value.ciphertext.length>15000||!/^[A-Za-z0-9+/=]+$/.test(value.ciphertext)||!/^[A-Za-z0-9+/]{16}$/.test(value.iv))throw response({error:'Invalid encrypted account key.'},400);return JSON.stringify({format:value.format,salt:value.salt,ciphertext:value.ciphertext,iv:value.iv});}
async function throttle(request:Request,email:string,action:string){const ip=request.headers.get('cf-connecting-ip')||'unknown';await rate('auth-ip:'+await accountHash(ip),action,action==='signup'?5:15);await rate('auth-email:'+await accountHash(email),action,action==='signup'?3:8);}
async function startLogin(id:string,version:number,request:Request){const token=randomToken();await db().prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(new Date().toISOString()).run();await db().prepare('INSERT INTO auth_sessions (token_hash,user_id,credential_version,expires_at) VALUES (?,?,?,?)').bind(await accountHash(token),id,version,new Date(Date.now()+12*3600000).toISOString()).run();return loginCookie(token,request);}
function authResponse(value:unknown,status:number,cookie:string,request:Request){const result=response(value,status,{'Set-Cookie':cookie});for(const part of (request.headers.get('cookie')||'').split(';')){const name=part.trim().split('=')[0];if(/^easyman_session_[a-f0-9]{16}$/.test(name))result.headers.append('Set-Cookie',`${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol==='https:'?'; Secure':''}`);}return result;}
export async function GET(request:Request){return endpoint(async()=>{const u=await getAccountUser(request);if(!u)throw response({error:'Sign in required.'},401);const account=await db().prepare('SELECT request_code FROM account_requests WHERE user_id=?').bind(u.userId).first<any>();return response({user:{id:u.userId,email:u.email,name:u.displayName,provider:u.provider},requestCode:account?.request_code||null,memberships:await accountMemberships(u.userId)});});}
export async function POST(request:Request){return endpoint(async()=>{
 sameOrigin(request);const data=await body(request,60000),action=String(data.action||''),email=normalizeEmail(data.email);
 if(action==='logout'){const u=await getAccountUser(request),token=request.headers.get('cookie')?.match(/(?:^|;\s*)easyman_login=([^;]*)/)?.[1];if(token)await db().prepare('UPDATE auth_sessions SET revoked=1 WHERE token_hash=?').bind(await accountHash(token)).run();return authResponse({ok:true,userId:u?.userId},200,loginCookie('',request,true),request);}
 if(action==='request-profile'){const u=await getAccountUser(request);if(!u)throw response({error:'Sign in required.'},401);await rate(u.userId,'account-request',5);const publicKey=validPublicKey(data.publicKey),old=await db().prepare('SELECT public_key FROM identities WHERE user_id=?').bind(u.userId).first<any>();if(old&&JSON.parse(old.public_key).n!==publicKey.n)throw response({error:'Restore your existing account key first.'},409);await db().batch([db().prepare('INSERT OR IGNORE INTO identities (user_id,public_key) VALUES (?,?)').bind(u.userId,JSON.stringify(publicKey)),db().prepare('INSERT OR IGNORE INTO account_requests (user_id,request_code,email,display_name,created_at) VALUES (?,?,?,?,?)').bind(u.userId,'EM-'+randomToken().slice(0,24),u.email,u.displayName,new Date().toISOString())]);return response({ok:true});}
 if(['signup','login','recover-open','recover'].includes(action)){
  if(!emailValid(email))throw response({error:'Enter a valid email address.'},400);await throttle(request,email,action==='signup'?'signup':'login');
  const account=await db().prepare('SELECT * FROM auth_accounts WHERE email=?').bind(email).first<any>();
  if(action==='signup'){
   const password=validPassword(data.password),name=typeof data.name==='string'?data.name.trim():'';if(!name||name.length>100)throw response({error:'Enter your name (up to 100 characters).'},400);
   const publicKey=validPublicKey(data.publicKey),passwordVault=vault(data.passwordVault),recoveryVault=vault(data.recoveryVault);if(!/^[a-f0-9]{64}$/.test(data.recoveryCode))throw response({error:'Create an account recovery code first.'},400);
   const salt=randomToken(),digest=await passwordDigest(password,salt);if(account)throw response({error:'Unable to create this account. Try signing in or recovering your account.'},400);
   const id='local:'+crypto.randomUUID();try{await db().batch([db().prepare('INSERT INTO auth_accounts (id,email,display_name,password_salt,password_hash,password_vault,recovery_hash,recovery_vault,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,email,name,salt,digest,passwordVault,await accountHash(data.recoveryCode),recoveryVault,new Date().toISOString()),db().prepare('INSERT INTO identities (user_id,public_key) VALUES (?,?)').bind(id,JSON.stringify(publicKey)),db().prepare('INSERT INTO account_requests (user_id,request_code,email,display_name,created_at) VALUES (?,?,?,?,?)').bind(id,'EM-'+randomToken().slice(0,24),email,name,new Date().toISOString())]);}catch{throw response({error:'Unable to create this account. Try signing in or recovering your account.'},400);}
   return authResponse({userId:id,waiting:true,returnTo:safeAccountReturn(data.returnTo)},201,await startLogin(id,1,request),request);
  }
  if(action==='login'){
   const supplied=typeof data.password==='string'&&data.password.length<=1024?data.password:'',digest=await passwordDigest(supplied,account?.password_salt||'unknown-account-timing-salt');
   if(!account||account.disabled||!sameDigest(digest,account.password_hash))throw response({error:'Email or password is incorrect.'},401);
   return authResponse({userId:account.id,passwordVault:JSON.parse(account.password_vault),returnTo:safeAccountReturn(data.returnTo)},200,await startLogin(account.id,account.credential_version,request),request);
  }
  const code=typeof data.recoveryCode==='string'?data.recoveryCode.trim():'';
  if(!account||account.disabled||!/^[a-f0-9]{64}$/.test(code)||!sameDigest(await accountHash(code),account.recovery_hash))throw response({error:'The email or recovery code is incorrect.'},401);
  if(action==='recover-open')return response({userId:account.id,recoveryVault:JSON.parse(account.recovery_vault)});
  const password=validPassword(data.password),passwordVault=vault(data.passwordVault),recoveryVault=vault(data.recoveryVault),newCode=String(data.newRecoveryCode||'');if(!/^[a-f0-9]{64}$/.test(newCode)||newCode===code)throw response({error:'Create a new recovery code.'},400);
  const salt=randomToken(),digest=await passwordDigest(password,salt);
  const result=await db().prepare('UPDATE auth_accounts SET password_salt=?,password_hash=?,password_vault=?,recovery_hash=?,recovery_vault=?,credential_version=credential_version+1 WHERE id=? AND recovery_hash=? RETURNING credential_version').bind(salt,digest,passwordVault,await accountHash(newCode),recoveryVault,account.id,account.recovery_hash).first<any>();if(!result)throw response({error:'Recovery code has already been used. Sign in again.'},409);
  await db().batch([db().prepare('UPDATE auth_sessions SET revoked=1 WHERE user_id=?').bind(account.id),db().prepare('UPDATE app_sessions SET revoked=1 WHERE user_id=?').bind(account.id)]);return authResponse({userId:account.id,returnTo:'/app'},200,await startLogin(account.id,result.credential_version,request),request);
 }
 if(action==='change-password'){
  const u=await getAccountUser(request);if(!u||u.provider!=='password')throw response({error:'Sign in with an EasyMan password account first.'},401);await throttle(request,u.email,'password-change');const account=await db().prepare('SELECT * FROM auth_accounts WHERE id=?').bind(u.userId).first<any>();
  if(!sameDigest(await passwordDigest(String(data.currentPassword||'').slice(0,1024),account.password_salt),account.password_hash))throw response({error:'Current password is incorrect.'},401);
  const password=validPassword(data.password),salt=randomToken(),passwordVault=vault(data.passwordVault);const result=await db().prepare('UPDATE auth_accounts SET password_salt=?,password_hash=?,password_vault=?,credential_version=credential_version+1 WHERE id=? AND credential_version=? RETURNING credential_version').bind(salt,await passwordDigest(password,salt),passwordVault,u.userId,account.credential_version).first<any>();if(!result)throw response({error:'Account changed. Sign in again.'},409);
  await db().batch([db().prepare('UPDATE auth_sessions SET revoked=1 WHERE user_id=?').bind(u.userId),db().prepare('UPDATE app_sessions SET revoked=1 WHERE user_id=?').bind(u.userId)]);return authResponse({ok:true},200,await startLogin(u.userId,result.credential_version,request),request);
 }
 throw response({error:'Unknown account action.'},400);
});}

