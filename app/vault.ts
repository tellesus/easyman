const encoder=new TextEncoder();const decoder=new TextDecoder();
const b64=(bytes:Uint8Array)=>{let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s);};
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export type Envelope={ciphertext:string;iv:string};
export async function encrypt(data:unknown,key:CryptoKey,aad?:string):Promise<Envelope> {const iv=crypto.getRandomValues(new Uint8Array(12));const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,...(aad?{additionalData:encoder.encode(aad)}:{})},key,encoder.encode(JSON.stringify(data)));return {iv:b64(iv),ciphertext:b64(new Uint8Array(ciphertext))};}
export async function decrypt<T>(data:Envelope,key:CryptoKey,aad?:string):Promise<T> {return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(data.iv),...(aad?{additionalData:encoder.encode(aad)}:{})},key,unb64(data.ciphertext))));}
export async function createKey(){return crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);}
export async function keyText(key:CryptoKey){return b64(new Uint8Array(await crypto.subtle.exportKey('raw',key)));}
export async function importKey(text:string){return crypto.subtle.importKey('raw',unb64(text.trim()),'AES-GCM',true,['encrypt','decrypt']);}
export async function deviceStore(owner:string,value?:unknown) {
  return new Promise<any>((resolve,reject)=>{const req=indexedDB.open('easyman-encrypted',1);req.onupgradeneeded=()=>req.result.createObjectStore('vaults');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction('vaults',value===undefined?'readonly':'readwrite');const op=value===undefined?tx.objectStore('vaults').get(owner):tx.objectStore('vaults').put(value,owner);op.onerror=()=>reject(op.error);tx.oncomplete=()=>{resolve(value===undefined?op.result:value);db.close();};tx.onerror=()=>reject(tx.error);};});
}
async function passwordKey(password:string,salt:Uint8Array<ArrayBuffer>){const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encryptBackup(config:unknown,password:string){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await passwordKey(password,salt);return {format:'easyman-configuration-v1',encrypted:true,salt:b64(salt),iterations:250000,...await encrypt(config,key)};}
export async function decryptBackup(data:any,password:string){if(data.format!=='easyman-configuration-v1'||data.iterations!==250000)throw new Error('Unsupported backup format.');return decrypt(data,await passwordKey(password,unb64(data.salt)));}
