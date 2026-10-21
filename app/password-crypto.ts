import {scryptAsync} from '@noble/hashes/scrypt.js';
import {encrypt,decrypt,type Envelope} from './vault-crypto';

export const PASSWORD_KDF={N:32768,r:8,p:3,dkLen:32,maxmem:40*1024*1024};
export const bytesHex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export const randomToken=()=>bytesHex(crypto.getRandomValues(new Uint8Array(32)));
export const normalizeEmail=(value:unknown)=>typeof value==='string'?value.trim().toLowerCase():'';
const blocked=new Set(['passwordpassword','passwordpassword1','password123456789','123456789012345','1234567890123456','qwertyuiopasdfgh','letmeinletmein123','iloveyouiloveyou','correct horse battery staple']);
export function validPassword(value:unknown){
  if(typeof value!=='string'||[...value].length<15||[...value].length>128||new TextEncoder().encode(value).length>1024)throw Error('Use a password or passphrase of 15–128 characters. Spaces and password managers are welcome.');
  if(blocked.has(value.toLowerCase())||/^(.)\1+$/.test(value)||/^(1234567890|password|qwerty)+\d*$/i.test(value))throw Error('Choose a less common password or passphrase.');
  return value.normalize('NFC');
}
// Bound memory per isolate. This is capacity protection; database throttling
// and account authorization remain authoritative across isolates.
let activePasswordKdfs=0;
export async function passwordDigest(password:string,salt:string){if(activePasswordKdfs)throw Error('Authentication is busy. Please try again in a moment.');activePasswordKdfs++;try{const bytes=await scryptAsync(password.normalize('NFC'),new TextEncoder().encode(salt),PASSWORD_KDF);try{return bytesHex(bytes);}finally{bytes.fill(0);}}finally{activePasswordKdfs--;}}
export function sameDigest(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export type AccountVault=Envelope&{format:'easyman-login-key-v1';salt:string};
async function vaultKey(secret:string,salt:string){const bytes=await scryptAsync(secret.normalize('NFC'),new TextEncoder().encode('EasyMan identity vault:'+salt),PASSWORD_KDF);try{return await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}finally{bytes.fill(0);}}
export async function lockLoginKey(identity:{publicKey:JsonWebKey;privateKey:CryptoKey},secret:string):Promise<AccountVault>{
  const salt=randomToken(),privateKey=await crypto.subtle.exportKey('jwk',identity.privateKey),key=await vaultKey(secret,salt);
  return {format:'easyman-login-key-v1',salt,...await encrypt({publicKey:identity.publicKey,privateKey},key,'easyman-login-key-v1')};
}
export async function unlockLoginKey(vault:AccountVault,secret:string){
  if(!vault||vault.format!=='easyman-login-key-v1'||!/^[a-f0-9]{64}$/.test(vault.salt))throw Error('Unsupported account key file.');
  const value=await decrypt<{publicKey:JsonWebKey;privateKey:JsonWebKey}>(vault,await vaultKey(secret,vault.salt),'easyman-login-key-v1');
  if(value.publicKey.n!==value.privateKey.n)throw Error('Account key is invalid.');
  return {publicKey:value.publicKey,privateKey:await crypto.subtle.importKey('jwk',value.privateKey,{name:'RSA-OAEP',hash:'SHA-256'},true,['unwrapKey'])};
}
