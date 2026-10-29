// Techpack documents belong to the stable native garment identity. Keep large
// embedded reference art in IndexedDB rather than the small localStorage quota.
const DB='exo-clothcraft-native-techpack-v1'
const STORE='documents'
const pendingWrites=new Map()

function openDb(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(Error('Local document storage unavailable'));return}
    const request=indexedDB.open(DB,1)
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)
    }
    request.onsuccess=()=>resolve(request.result)
    request.onerror=()=>reject(request.error||Error('Could not open techpack storage'))
    request.onblocked=()=>reject(Error('Techpack database is in use by another window'))
  })
}

function transaction(db,key,value,method){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,method==='get'?'readonly':'readwrite')
    const request=method==='get'?tx.objectStore(STORE).get(key):tx.objectStore(STORE).put(value,key)
    let data
    request.onsuccess=()=>{data=request.result}
    tx.oncomplete=()=>resolve(data)
    tx.onerror=()=>reject(tx.error||request.error||Error('Techpack database operation failed'))
    tx.onabort=()=>reject(tx.error||Error('Techpack database operation cancelled'))
  }).finally(()=>db.close())
}

export async function loadNativeTechPackWorkspace(key){
  if(typeof key!=='string'||!key.trim())throw Error('Missing native garment identity')
  await pendingWrites.get(key)
  return transaction(await openDb(),key,null,'get')
}

export function saveNativeTechPackWorkspace(key,value){
  if(typeof key!=='string'||!key.trim())throw Error('Missing native garment identity')
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid techpack document')
  // Serialize writes in editing order, even if concurrent database open calls
  // would otherwise finish in a different order on a busy native host.
  const next=(pendingWrites.get(key)||Promise.resolve()).catch(()=>{}).then(async()=>transaction(await openDb(),key,value,'put'))
  pendingWrites.set(key,next)
  next.finally(()=>{if(pendingWrites.get(key)===next)pendingWrites.delete(key)}).catch(()=>{})
  return next
}
