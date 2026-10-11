export * from './vault-crypto';
export async function deviceStore(owner:string,value?:unknown) {
  return new Promise<any>((resolve,reject)=>{const req=indexedDB.open('easyman-encrypted',1);req.onupgradeneeded=()=>req.result.createObjectStore('vaults');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction('vaults',value===undefined?'readonly':'readwrite');const op=value===undefined?tx.objectStore('vaults').get(owner):tx.objectStore('vaults').put(value,owner);op.onerror=()=>reject(op.error);tx.oncomplete=()=>{resolve(value===undefined?op.result:value);db.close();};tx.onerror=()=>reject(tx.error);};});
}
